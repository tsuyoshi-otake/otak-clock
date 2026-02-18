import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { flashStatusBars } from '../utils/statusBar';
import { AlarmSettings } from './AlarmSettings';
import {
    ALARM_REPEAT_DURATION_MS,
    ALARM_REPEAT_INTERVAL_MS,
    ALARM_SNOOZE_DURATION_MS,
    ALARM_SOUND_ENABLED_SETTING
} from './constants';
import { I18nManager } from '../i18n/I18nManager';
import { formatLocalAlarmTime } from './localTime';

interface AlarmNotificationSession {
    id: string;
    repeatUntilMs: number;
    nextNotifyAtMs: number;
    alarmIds: string[];
    stopped: boolean;
}

export interface AlarmNotificationControllerOptions {
    i18n: I18nManager;
    statusBars: vscode.StatusBarItem[];
    getAlarms: () => AlarmSettings[];
    saveAlarms: (alarms: AlarmSettings[]) => void;
    showAlarmMenu: () => Promise<void>;
}

function readAlarmSoundEnabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>(ALARM_SOUND_ENABLED_SETTING, true);
}

export class AlarmNotificationController implements vscode.Disposable {
    private readonly options: AlarmNotificationControllerOptions;
    private session: AlarmNotificationSession | undefined;
    private timer: NodeJS.Timeout | undefined;
    private sessionSeq = 0;
    private flashDisposable: vscode.Disposable | undefined;
    private disposed = false;

    constructor(options: AlarmNotificationControllerOptions) {
        this.options = options;
    }

    startOrMerge(triggeredAlarms: AlarmSettings[], nowMs: number): void {
        const incomingIds = triggeredAlarms
            .map((alarm) => alarm.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
        if (incomingIds.length === 0) {
            return;
        }

        if (!this.session || this.session.stopped || nowMs >= this.session.repeatUntilMs) {
            this.session = {
                id: this.createSessionId(),
                repeatUntilMs: nowMs + ALARM_REPEAT_DURATION_MS,
                nextNotifyAtMs: nowMs,
                alarmIds: [...new Set(incomingIds)],
                stopped: false
            };
        } else {
            this.session.alarmIds = [...new Set([...this.session.alarmIds, ...incomingIds])];
            this.session.nextNotifyAtMs = Math.min(this.session.nextNotifyAtMs, nowMs);
            this.session.repeatUntilMs = Math.max(this.session.repeatUntilMs, nowMs + ALARM_REPEAT_DURATION_MS);
        }

        this.processSession(nowMs);
    }

    prune(alarms: AlarmSettings[]): void {
        if (!this.session) {
            return;
        }

        const liveIds = new Set(
            alarms
                .map((alarm) => alarm.id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0)
        );
        this.session.alarmIds = this.session.alarmIds.filter((id) => liveIds.has(id));

        if (this.session.alarmIds.length === 0) {
            this.stopSession(this.session.id);
        }
    }

    private createSessionId(): string {
        this.sessionSeq += 1;
        return `session-${Date.now().toString(36)}-${this.sessionSeq.toString(36)}`;
    }

    private clearTimer(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    private scheduleTimer(): void {
        this.clearTimer();

        const session = this.session;
        if (!session || session.stopped) {
            return;
        }

        const nowMs = Date.now();
        if (nowMs >= session.repeatUntilMs) {
            this.stopSession(session.id);
            return;
        }

        const delay = Math.max(0, session.nextNotifyAtMs - nowMs);
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.processSession(Date.now());
        }, delay);
    }

    private stopSession(sessionId: string): void {
        if (!this.session || this.session.id !== sessionId) {
            return;
        }
        this.session.stopped = true;
        this.session = undefined;
        this.clearTimer();
    }

    private processSession(nowMs: number): void {
        const session = this.session;
        if (!session || session.stopped) {
            return;
        }

        if (nowMs >= session.repeatUntilMs) {
            this.stopSession(session.id);
            return;
        }

        if (nowMs < session.nextNotifyAtMs) {
            this.scheduleTimer();
            return;
        }

        this.showToast(session.id, session.alarmIds);
        session.nextNotifyAtMs = nowMs + ALARM_REPEAT_INTERVAL_MS;
        this.scheduleTimer();
    }

    private collectSessionAlarms(alarmIds: string[]): AlarmSettings[] {
        const idSet = new Set(alarmIds);
        return this.options.getAlarms().filter((alarm) => typeof alarm.id === 'string' && idSet.has(alarm.id));
    }

    private flashAlarmIndicators(): void {
        this.flashDisposable?.dispose();
        this.flashDisposable = flashStatusBars(this.options.statusBars);
    }

    private runSoundCommand(command: string, args: string[], onFailure: () => void): void {
        let failed = false;
        const fail = (): void => {
            if (failed) {
                return;
            }
            failed = true;
            onFailure();
        };

        const child = execFile(command, args, { windowsHide: true }, (error) => {
            if (error) {
                fail();
            }
        });
        child.on('error', () => fail());
    }

    private playAlarmSound(): void {
        if (!readAlarmSoundEnabled()) {
            return;
        }

        const ringTerminalBell = (): void => {
            process.stdout.write('\u0007');
        };

        if (process.platform === 'win32') {
            this.runSoundCommand('powershell', ['-NoProfile', '-NonInteractive', '-Command', '[console]::Beep(880,250)'], ringTerminalBell);
            return;
        }

        if (process.platform === 'darwin') {
            this.runSoundCommand('afplay', ['/System/Library/Sounds/Glass.aiff'], ringTerminalBell);
            return;
        }

        this.runSoundCommand(
            'paplay',
            ['/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga'],
            () => this.runSoundCommand('canberra-gtk-play', ['-i', 'message'], ringTerminalBell)
        );
    }

    private showToast(sessionId: string, alarmIds: string[]): void {
        const session = this.session;
        if (!session || session.id !== sessionId || session.stopped) {
            return;
        }

        const alarms = this.collectSessionAlarms(alarmIds);
        if (alarms.length === 0) {
            this.stopSession(sessionId);
            return;
        }

        const now = new Date();
        const times = alarms.map((alarm) => formatLocalAlarmTime(alarm.hour, alarm.minute, now));
        const title = times.length === 1
            ? this.options.i18n.t('alarm.notification.singleTitle', { time: times[0] })
            : this.options.i18n.t('alarm.notification.multiTitle', { count: String(times.length), times: times.join(', ') });

        const stopLabel = this.options.i18n.t('alarm.notification.action.stop');
        const snoozeLabel = this.options.i18n.t('alarm.notification.action.snooze3m');
        const manageLabel = this.options.i18n.t('alarm.notification.action.manage');

        this.playAlarmSound();
        this.flashAlarmIndicators();

        void vscode.window.showInformationMessage(title, stopLabel, snoozeLabel, manageLabel).then((picked) => {
            if (!picked) {
                return;
            }

            const current = this.session;
            if (!current || current.id !== sessionId || current.stopped) {
                return;
            }

            if (picked === stopLabel) {
                this.stopSession(sessionId);
                return;
            }

            if (picked === snoozeLabel) {
                const snoozeUntilMs = Date.now() + ALARM_SNOOZE_DURATION_MS;
                const sessionIdSet = new Set(current.alarmIds);
                const updated = this.options.getAlarms().map((alarm) => {
                    if (!alarm.id || !sessionIdSet.has(alarm.id)) {
                        return alarm;
                    }
                    return { ...alarm, triggered: false, snoozeUntilMs };
                });
                this.options.saveAlarms(updated);
                this.stopSession(sessionId);
                return;
            }

            if (picked === manageLabel) {
                this.stopSession(sessionId);
                void this.options.showAlarmMenu();
            }
        });
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (this.session) {
            this.stopSession(this.session.id);
        }
        this.flashDisposable?.dispose();
    }
}
