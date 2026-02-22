import * as vscode from 'vscode';
import { flashStatusBars } from '../utils/statusBar';
import { AlarmSettings } from './AlarmSettings';
import {
    ALARM_REPEAT_INTERVAL_MS,
    ALARM_SNOOZE_DURATION_MS
} from './constants';
import { I18nManager } from '../i18n/I18nManager';
import { formatLocalAlarmTime } from './localTime';
import { toLocalDateKey } from './alarmTick';

interface AlarmNotificationSession {
    id: string;
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
    /** Re-reads alarm state from globalState. Called before each repeat toast to detect external changes. */
    refreshAlarms: () => void;
    /** Persists dismissedOn for the given alarm IDs so other windows can stop their sessions. */
    dismissAlarms: (alarmIds: string[]) => void;
    /** Returns the resolved alarm timezone ID, or undefined for system local. */
    getAlarmTimeZone: () => string | undefined;
}

export class AlarmNotificationController implements vscode.Disposable {
    private readonly options: AlarmNotificationControllerOptions;
    private session: AlarmNotificationSession | undefined;
    private timer: NodeJS.Timeout | undefined;
    private sessionSeq = 0;
    private flashDisposable: vscode.Disposable | undefined;
    private activeToastSessionId: string | undefined;
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

        if (!this.session || this.session.stopped) {
            this.session = {
                id: this.createSessionId(),
                nextNotifyAtMs: nowMs,
                alarmIds: [...new Set(incomingIds)],
                stopped: false
            };
        } else {
            this.session.alarmIds = [...new Set([...this.session.alarmIds, ...incomingIds])];
            this.session.nextNotifyAtMs = Math.min(this.session.nextNotifyAtMs, nowMs);
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
        if (this.activeToastSessionId === sessionId) {
            this.activeToastSessionId = undefined;
        }
        this.clearTimer();
    }

    private processSession(nowMs: number): void {
        const session = this.session;
        if (!session || session.stopped) {
            return;
        }

        if (nowMs < session.nextNotifyAtMs) {
            this.scheduleTimer();
            return;
        }

        // Refresh from globalState to detect Stop pressed in another window.
        this.options.refreshAlarms();
        if (this.isSessionDismissed(session.alarmIds)) {
            this.stopSession(session.id);
            return;
        }

        this.showToast(session.id, session.alarmIds);
        session.nextNotifyAtMs = nowMs + ALARM_REPEAT_INTERVAL_MS;
        this.scheduleTimer();
    }

    private isSessionDismissed(alarmIds: string[]): boolean {
        const todayKey = toLocalDateKey(new Date(), this.options.getAlarmTimeZone());
        const alarms = this.collectSessionAlarms(alarmIds);
        return alarms.length > 0 && alarms.every((alarm) => alarm.dismissedOn === todayKey);
    }

    /**
     * Called by AlarmManager on every tick (every second when focused, every minute when unfocused).
     * Detects Stop pressed in another window via dismissedOn in globalState and stops this session.
     * Note: refreshAlarms() must be called before this to ensure fresh state.
     */
    checkForExternalDismissal(): void {
        const session = this.session;
        if (!session || session.stopped) {
            return;
        }
        if (this.isSessionDismissed(session.alarmIds)) {
            this.stopSession(session.id);
        }
    }

    private collectSessionAlarms(alarmIds: string[]): AlarmSettings[] {
        const idSet = new Set(alarmIds);
        return this.options.getAlarms().filter((alarm) => typeof alarm.id === 'string' && idSet.has(alarm.id));
    }

    private flashAlarmIndicators(): void {
        this.flashDisposable?.dispose();
        this.flashDisposable = flashStatusBars(this.options.statusBars);
    }

    private playAlarmSound(): void {
        // 音は無効化: 通知はトーストとステータスバー点滅のみで運用する
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
        const alarmTimeZone = this.options.getAlarmTimeZone();
        const times = alarms.map((alarm) => formatLocalAlarmTime(alarm.hour, alarm.minute, now, alarmTimeZone));
        const title = times.length === 1
            ? this.options.i18n.t('alarm.notification.singleTitle', { time: times[0] })
            : this.options.i18n.t('alarm.notification.multiTitle', { count: String(times.length), times: times.join(', ') });

        const stopLabel = this.options.i18n.t('alarm.notification.action.stop');
        const snoozeLabel = this.options.i18n.t('alarm.notification.action.snooze3m');
        const manageLabel = this.options.i18n.t('alarm.notification.action.manage');

        if (this.activeToastSessionId === sessionId) {
            return;
        }

        this.activeToastSessionId = sessionId;
        this.playAlarmSound();
        this.flashAlarmIndicators();

        void vscode.window.showInformationMessage(title, stopLabel, snoozeLabel, manageLabel).then((picked) => {
            if (this.activeToastSessionId === sessionId) {
                this.activeToastSessionId = undefined;
            }

            if (!picked) {
                const current = this.session;
                if (current && current.id === sessionId && !current.stopped) {
                    current.nextNotifyAtMs = Math.min(current.nextNotifyAtMs, Date.now() + 5000);
                    this.scheduleTimer();
                }
                return;
            }

            const current = this.session;
            if (!current || current.id !== sessionId || current.stopped) {
                return;
            }

            if (picked === stopLabel) {
                this.options.dismissAlarms(current.alarmIds);
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
