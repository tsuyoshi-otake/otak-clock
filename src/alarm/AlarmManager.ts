import * as vscode from 'vscode';
import {
    AlarmSettings,
    createDefaultAlarm,
    formatTime
} from './AlarmSettings';
import { evaluateAlarmTick, toLocalDateKey } from './alarmTick';
import { I18nManager } from '../i18n/I18nManager';
import { sleep } from '../utils/timing';
import {
    MAX_ALARMS,
    STATUS_BAR_ALARM_PRIORITY,
    PROGRESS_NOTIFICATION_DISPLAY_MS,
    ALARM_TIME_ZONE_SETTING
} from './constants';
import { AlarmTimeZoneResolver, buildAlarmStatusBarState } from './AlarmStatus';
import { AlarmStore } from './AlarmStore';
import { AlarmNotificationController } from './AlarmNotificationController';
import {
    pickAlarmId,
    promptForAlarmTime,
    showAlarmMenuQuickPick
} from './ui';
import { pruneNotificationMap, updateAlarmById } from './stateUtils';
import { formatLocalAlarmTime } from './localTime';
import { findTimeZoneById } from '../timezone/data';
import { resolveAlarmTimeZone as resolveAlarmTimeZonePure } from './timeZoneResolution';

export class AlarmManager implements vscode.Disposable {
    private readonly alarmStatusBar: vscode.StatusBarItem;
    private readonly i18n: I18nManager;
    private readonly notifier: AlarmNotificationController;
    private readonly lastNotificationTimeMsById: Map<string, number> = new Map();
    private readonly store: AlarmStore;
    private readonly configurationDisposable: vscode.Disposable;
    /** Bound per-alarm resolver, passed to UI helpers that render a list of alarms in different timezones. */
    private readonly resolveTimeZoneFor: AlarmTimeZoneResolver = (alarm) => this.resolveAlarmTimeZone(alarm);
    private globalAlarmTimeZone: string | undefined;
    private globalAlarmTimeZoneCached = false;
    private isDisposed = false;

    constructor(context: vscode.ExtensionContext, statusBars: vscode.StatusBarItem[]) {
        this.i18n = I18nManager.getInstance();
        this.store = new AlarmStore(context);
        this.notifier = new AlarmNotificationController({
            i18n: this.i18n,
            statusBars,
            getAlarms: () => this.store.getAll(),
            saveAlarms: (alarms) => this.saveAlarms(alarms),
            showAlarmMenu: () => this.showAlarmMenu(),
            refreshAlarms: () => this.refreshFromGlobalState(),
            dismissAlarms: (alarmIds) => this.dismissAlarms(alarmIds),
            getAlarmTimeZone: (alarm) => this.resolveAlarmTimeZone(alarm)
        });
        this.alarmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_ALARM_PRIORITY);
        this.alarmStatusBar.command = 'otak-clock.listAlarms';
        this.updateAlarmStatusBar();
        this.alarmStatusBar.show();

        // otak-clock.alarmTimeZone affects every alarm's evaluation timezone (see
        // resolveAlarmTimeZone()), but the status bar label is only recomputed on
        // the next tick/action otherwise, leaving a stale timezone label displayed
        // even though the next tick already evaluates alarms in the new timezone.
        this.configurationDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (!e.affectsConfiguration(ALARM_TIME_ZONE_SETTING)) {
                return;
            }
            this.globalAlarmTimeZoneCached = false;
            this.updateAlarmStatusBar();
        });
    }

    /**
     * Reading configuration is not free, and resolveAlarmTimeZone() is called once per alarm on
     * every minute tick plus once per rendered row in every alarm UI. The value can only change
     * through onDidChangeConfiguration, which invalidates this cache, so it is read at most once
     * per settings change instead of several times a minute forever.
     */
    private getGlobalAlarmTimeZone(): string | undefined {
        if (this.globalAlarmTimeZoneCached) {
            return this.globalAlarmTimeZone;
        }

        const raw = vscode.workspace.getConfiguration('otak-clock').get<string>('alarmTimeZone', 'auto');
        this.globalAlarmTimeZone = raw === 'auto' || !raw || !findTimeZoneById(raw) ? undefined : raw;
        this.globalAlarmTimeZoneCached = true;
        return this.globalAlarmTimeZone;
    }

    /**
     * Resolves the effective timezone for a specific alarm: the global
     * `otak-clock.alarmTimeZone` override wins when set, otherwise the alarm's own
     * `timeZoneId` (captured at creation/edit time) is used, otherwise undefined
     * (system-local). See timeZoneResolution.ts for the full priority rationale.
     */
    private resolveAlarmTimeZone(alarm?: AlarmSettings): string | undefined {
        return resolveAlarmTimeZonePure(this.getGlobalAlarmTimeZone(), alarm);
    }

    private static detectSystemTimeZone(): string {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }

    private refreshFromGlobalState(): void {
        if (!this.store.refresh()) {
            return;
        }

        const alarms = this.store.getAll();
        pruneNotificationMap(this.lastNotificationTimeMsById, alarms);
        this.notifier.prune(alarms);
        this.updateAlarmStatusBar();
    }

    private saveAlarms(alarms: AlarmSettings[]): void {
        const normalized = this.store.save(alarms);
        pruneNotificationMap(this.lastNotificationTimeMsById, normalized);
        this.notifier.prune(normalized);
        this.updateAlarmStatusBar();
    }

    private dismissAlarms(alarmIds: string[]): void {
        const idSet = new Set(alarmIds);
        const now = new Date();
        const updated = this.store.getAll().map((alarm) => {
            if (!alarm.id || !idSet.has(alarm.id)) {
                return alarm;
            }
            const todayKey = toLocalDateKey(now, this.resolveAlarmTimeZone(alarm));
            return { ...alarm, dismissedOn: todayKey };
        });
        this.saveAlarms(updated);
    }

    private applyUpdateById(alarmId: string, updater: (alarm: AlarmSettings) => AlarmSettings): boolean {
        const updated = updateAlarmById(this.store.getAll(), alarmId, updater);
        if (!updated.found) {
            return false;
        }

        this.saveAlarms(updated.alarms);
        return true;
    }

    async setAlarm(): Promise<void> {
        this.refreshFromGlobalState();
        if (this.store.getAll().length >= MAX_ALARMS) {
            void vscode.window.showWarningMessage(this.i18n.t('alarm.error.maxAlarmsReached', { max: String(MAX_ALARMS) }));
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
            timeZoneId: AlarmManager.detectSystemTimeZone(),
            triggered: false,
            lastTriggeredOn: undefined,
            snoozeUntilMs: undefined
        };
        this.saveAlarms([...this.store.getAll(), alarm]);

        const displayTime = formatLocalAlarmTime(picked.hour, picked.minute, new Date(), this.resolveAlarmTimeZone(alarm));
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.set', { time: displayTime }),
            cancellable: false
        }, () => sleep(PROGRESS_NOTIFICATION_DISPLAY_MS));
    }

    async editAlarm(alarmId?: string): Promise<void> {
        this.refreshFromGlobalState();
        const targetId = alarmId ?? await pickAlarmId(this.store.getAll(), this.i18n, this.i18n.t('alarm.menu.selectToEdit'), this.resolveTimeZoneFor);
        if (!targetId) {
            if (this.store.getAll().length === 0) {
                await this.setAlarm();
            }
            return;
        }

        const alarm = this.store.getById(targetId);
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
            timeZoneId: AlarmManager.detectSystemTimeZone(),
            triggered: false,
            lastTriggeredOn: undefined,
            snoozeUntilMs: undefined
        }));
        if (!updated) {
            return;
        }

        const updatedAlarm = this.store.getById(targetId);
        const displayTime = formatLocalAlarmTime(picked.hour, picked.minute, new Date(), this.resolveAlarmTimeZone(updatedAlarm));
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.updated', { time: displayTime }),
            cancellable: false
        }, () => sleep(PROGRESS_NOTIFICATION_DISPLAY_MS));
    }

    async toggleAlarm(alarmId?: string): Promise<void> {
        this.refreshFromGlobalState();
        const targetId = alarmId ?? await pickAlarmId(this.store.getAll(), this.i18n, this.i18n.t('alarm.menu.selectToToggle'), this.resolveTimeZoneFor);
        if (!targetId) {
            return;
        }

        const updated = this.applyUpdateById(targetId, (alarm) => ({ ...alarm, enabled: !alarm.enabled }));
        if (!updated) {
            return;
        }

        const next = this.store.getById(targetId);
        if (!next) {
            return;
        }

        const message = next.enabled
            ? this.i18n.t('alarm.message.enabled', { time: formatLocalAlarmTime(next.hour, next.minute, new Date(), this.resolveAlarmTimeZone(next)) })
            : this.i18n.t('alarm.message.disabled');
        void vscode.window.showInformationMessage(message);
    }

    async deleteAlarm(alarmId?: string): Promise<void> {
        this.refreshFromGlobalState();
        const targetId = alarmId ?? await pickAlarmId(this.store.getAll(), this.i18n, this.i18n.t('alarm.menu.selectToDelete'), this.resolveTimeZoneFor);
        if (!targetId) {
            return;
        }

        const alarm = this.store.getById(targetId);
        if (!alarm) {
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            this.i18n.t('alarm.confirm.delete', { time: formatLocalAlarmTime(alarm.hour, alarm.minute, new Date(), this.resolveAlarmTimeZone(alarm)) }),
            { modal: true },
            this.i18n.t('alarm.action.delete')
        );
        if (confirmation !== this.i18n.t('alarm.action.delete')) {
            return;
        }

        this.saveAlarms(this.store.getAll().filter((item) => item.id !== targetId));
        void vscode.window.showInformationMessage(this.i18n.t('alarm.message.deleted'));
    }

    async showAlarmMenu(): Promise<void> {
        this.refreshFromGlobalState();
        const picked = await showAlarmMenuQuickPick(this.store.getAll(), this.i18n, MAX_ALARMS, this.resolveTimeZoneFor);
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
        this.notifier.checkForExternalDismissal();
        if (this.store.getAll().length === 0) {
            return;
        }

        const current = this.store.getAll();
        // Almost every tick leaves every alarm untouched, so the working copy is only allocated
        // once something actually needs to be written back.
        let next: AlarmSettings[] | undefined;
        let triggered: AlarmSettings[] | undefined;

        for (let i = 0; i < current.length; i += 1) {
            // Reading from `current` is safe: index i has not been written yet this pass.
            const alarm = current[i];
            const alarmId = alarm.id;
            if (!alarmId) {
                continue;
            }

            const alarmTimeZone = this.resolveAlarmTimeZone(alarm);
            const lastNotificationTimeMs = this.lastNotificationTimeMsById.get(alarmId) ?? 0;
            const result = evaluateAlarmTick(alarm, now, lastNotificationTimeMs, alarmTimeZone);

            switch (result.action) {
                case 'none':
                    break;
                case 'save':
                    next = next ?? [...current];
                    next[i] = result.alarm;
                    break;
                case 'trigger': {
                    const updated: AlarmSettings = {
                        ...result.alarm,
                        triggered: true,
                        lastTriggeredOn: result.todayKey
                    };
                    next = next ?? [...current];
                    next[i] = updated;
                    this.lastNotificationTimeMsById.set(alarmId, now.getTime());
                    (triggered = triggered ?? []).push(updated);
                    break;
                }
            }
        }

        if (next) {
            this.saveAlarms(next);
        }
        if (triggered) {
            this.notifier.startOrMerge(triggered, now.getTime());
        }
    }

    private updateAlarmStatusBar(): void {
        const state = buildAlarmStatusBarState(this.store.getAll(), this.i18n, this.resolveTimeZoneFor);
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
        this.configurationDisposable.dispose();
    }
}
