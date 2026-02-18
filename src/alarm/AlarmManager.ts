import * as vscode from 'vscode';
import {
    AlarmSettings,
    createDefaultAlarm,
    formatTime
} from './AlarmSettings';
import { evaluateAlarmTick } from './alarmTick';
import { I18nManager } from '../i18n/I18nManager';
import { sleep } from '../utils/timing';
import { MAX_ALARMS } from './constants';
import {
    STATUS_BAR_ALARM_PRIORITY,
    PROGRESS_NOTIFICATION_DISPLAY_MS
} from '../clock/constants';
import { buildAlarmStatusBarState } from './AlarmStatus';
import {
    loadAlarmsFromGlobalState,
    saveAlarmsToGlobalState
} from './storage';
import { AlarmNotificationController } from './AlarmNotificationController';
import { pickAlarmId, promptForAlarmTime, showAlarmMenuQuickPick } from './ui';
import { pruneNotificationMap, sameAlarms, updateAlarmById } from './stateUtils';
import { formatLocalAlarmTime } from './localTime';
export class AlarmManager implements vscode.Disposable {
    private readonly context: vscode.ExtensionContext;
    private readonly alarmStatusBar: vscode.StatusBarItem;
    private readonly i18n: I18nManager;
    private readonly notifier: AlarmNotificationController;
    private readonly lastNotificationTimeMsById: Map<string, number> = new Map();
    private alarms: AlarmSettings[];
    private isDisposed = false;

    constructor(context: vscode.ExtensionContext, statusBars: vscode.StatusBarItem[]) {
        this.context = context;
        this.i18n = I18nManager.getInstance();
        this.alarms = loadAlarmsFromGlobalState(this.context);

        this.notifier = new AlarmNotificationController({
            i18n: this.i18n,
            statusBars,
            getAlarms: () => this.alarms,
            saveAlarms: (alarms) => this.saveAlarms(alarms),
            showAlarmMenu: () => this.showAlarmMenu()
        });

        this.alarmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_ALARM_PRIORITY);
        this.alarmStatusBar.command = 'otak-clock.listAlarms';
        this.updateAlarmStatusBar();
        this.alarmStatusBar.show();
    }

    private refreshFromGlobalState(): void {
        const next = loadAlarmsFromGlobalState(this.context);
        if (sameAlarms(this.alarms, next)) {
            return;
        }

        this.alarms = next;
        pruneNotificationMap(this.lastNotificationTimeMsById, next);
        this.notifier.prune(next);
        this.updateAlarmStatusBar();
    }

    private saveAlarms(alarms: AlarmSettings[]): void {
        const normalized = saveAlarmsToGlobalState(this.context, alarms);
        this.alarms = normalized;
        pruneNotificationMap(this.lastNotificationTimeMsById, normalized);
        this.notifier.prune(normalized);
        this.updateAlarmStatusBar();
    }

    private getAlarmById(alarmId: string): AlarmSettings | undefined {
        return this.alarms.find((alarm) => alarm.id === alarmId);
    }

    private applyUpdateById(alarmId: string, updater: (alarm: AlarmSettings) => AlarmSettings): boolean {
        const updated = updateAlarmById(this.alarms, alarmId, updater);
        if (!updated.found) {
            return false;
        }

        this.saveAlarms(updated.alarms);
        return true;
    }

    async setAlarm(): Promise<void> {
        this.refreshFromGlobalState();
        if (this.alarms.length >= MAX_ALARMS) {
            void vscode.window.showWarningMessage(`You can set up to ${MAX_ALARMS} alarms.`);
            return;
        }

        const picked = await promptForAlarmTime(this.i18n);
        if (!picked) {
            return;
        }

        const alarm: AlarmSettings = {
            ...createDefaultAlarm(),
            hour: picked.hour,
            minute: picked.minute,
            triggered: false,
            lastTriggeredOn: undefined,
            snoozeUntilMs: undefined
        };
        this.saveAlarms([...this.alarms, alarm]);

        const displayTime = formatLocalAlarmTime(picked.hour, picked.minute);
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.set', { time: displayTime }),
            cancellable: false
        }, () => sleep(PROGRESS_NOTIFICATION_DISPLAY_MS));
    }

    async editAlarm(alarmId?: string): Promise<void> {
        this.refreshFromGlobalState();
        const targetId = alarmId ?? await pickAlarmId(this.alarms, this.i18n, 'Select an alarm to edit');
        if (!targetId) {
            if (this.alarms.length === 0) {
                await this.setAlarm();
            }
            return;
        }

        const alarm = this.getAlarmById(targetId);
        if (!alarm) {
            return;
        }

        const picked = await promptForAlarmTime(this.i18n, formatTime(alarm.hour, alarm.minute));
        if (!picked) {
            return;
        }

        const updated = this.applyUpdateById(targetId, (current) => ({
            ...current,
            hour: picked.hour,
            minute: picked.minute,
            triggered: false,
            lastTriggeredOn: undefined,
            snoozeUntilMs: undefined
        }));
        if (!updated) {
            return;
        }

        const displayTime = formatLocalAlarmTime(picked.hour, picked.minute);
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.updated', { time: displayTime }),
            cancellable: false
        }, () => sleep(PROGRESS_NOTIFICATION_DISPLAY_MS));
    }

    async toggleAlarm(alarmId?: string): Promise<void> {
        this.refreshFromGlobalState();
        const targetId = alarmId ?? await pickAlarmId(this.alarms, this.i18n, 'Select an alarm to toggle');
        if (!targetId) {
            return;
        }

        const updated = this.applyUpdateById(targetId, (alarm) => ({ ...alarm, enabled: !alarm.enabled }));
        if (!updated) {
            return;
        }

        const next = this.getAlarmById(targetId);
        if (!next) {
            return;
        }

        const message = next.enabled
            ? this.i18n.t('alarm.message.enabled', { time: formatLocalAlarmTime(next.hour, next.minute) })
            : this.i18n.t('alarm.message.disabled');
        void vscode.window.showInformationMessage(message);
    }

    async deleteAlarm(alarmId?: string): Promise<void> {
        this.refreshFromGlobalState();
        const targetId = alarmId ?? await pickAlarmId(this.alarms, this.i18n, 'Select an alarm to delete');
        if (!targetId) {
            return;
        }

        const alarm = this.getAlarmById(targetId);
        if (!alarm) {
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            this.i18n.t('alarm.confirm.delete', { time: formatLocalAlarmTime(alarm.hour, alarm.minute) }),
            { modal: true },
            this.i18n.t('alarm.action.delete')
        );
        if (confirmation !== this.i18n.t('alarm.action.delete')) {
            return;
        }

        this.saveAlarms(this.alarms.filter((item) => item.id !== targetId));
        void vscode.window.showInformationMessage(this.i18n.t('alarm.message.deleted'));
    }

    async showAlarmMenu(): Promise<void> {
        this.refreshFromGlobalState();
        const picked = await showAlarmMenuQuickPick(this.alarms, this.i18n, MAX_ALARMS);
        if (!picked) {
            return;
        }

        switch (picked.action) {
            case 'set':
                await this.setAlarm();
                break;
            case 'toggle':
                if (picked.alarmId) {
                    await this.toggleAlarm(picked.alarmId);
                }
                break;
            case 'edit':
                if (picked.alarmId) {
                    await this.editAlarm(picked.alarmId);
                }
                break;
            case 'delete':
                if (picked.alarmId) {
                    await this.deleteAlarm(picked.alarmId);
                }
                break;
            default:
                break;
        }
    }

    tick(now: Date): void {
        this.refreshFromGlobalState();
        if (this.alarms.length === 0) {
            return;
        }

        const next = [...this.alarms];
        const triggered: AlarmSettings[] = [];
        let changed = false;

        for (let i = 0; i < next.length; i += 1) {
            const alarm = next[i];
            const alarmId = alarm.id;
            if (!alarmId) {
                continue;
            }

            const lastNotificationTimeMs = this.lastNotificationTimeMsById.get(alarmId) ?? 0;
            const result = evaluateAlarmTick(alarm, now, lastNotificationTimeMs);

            switch (result.action) {
                case 'none':
                    break;
                case 'save':
                    next[i] = result.alarm;
                    changed = true;
                    break;
                case 'trigger': {
                    const updated: AlarmSettings = {
                        ...result.alarm,
                        triggered: true,
                        lastTriggeredOn: result.todayKey
                    };
                    next[i] = updated;
                    this.lastNotificationTimeMsById.set(alarmId, now.getTime());
                    triggered.push(updated);
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            this.saveAlarms(next);
        }
        if (triggered.length > 0) {
            this.notifier.startOrMerge(triggered, now.getTime());
        }
    }

    private updateAlarmStatusBar(): void {
        const state = buildAlarmStatusBarState(this.alarms, this.i18n);
        this.alarmStatusBar.text = state.text;
        this.alarmStatusBar.tooltip = state.tooltip;
    }

    dispose(): void {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.notifier.dispose();
        this.alarmStatusBar.dispose();
    }
}
