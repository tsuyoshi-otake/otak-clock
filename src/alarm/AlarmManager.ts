import * as vscode from 'vscode';
import { flashStatusBars } from '../utils/statusBar';
import {
    ALARM_TIME_REGEX,
    AlarmConfig,
    AlarmRuntime,
    AlarmSettings,
    createDefaultAlarm,
    formatTime,
    toAlarmConfig,
    toAlarmRuntime,
    validateAlarmConfig,
    validateAlarmRuntime,
    validateAlarmSettings
} from './AlarmSettings';
import { buildAlarmStatusBarState } from './AlarmStatus';
import { evaluateAlarmTick } from './alarmTick';
import { I18nManager } from '../i18n/I18nManager';
import { sleep } from '../utils/timing';
import { ALARM_CONFIG_KEY, ALARM_RUNTIME_KEY, LEGACY_ALARM_STATE_KEY } from './constants';
import {
    STATUS_BAR_ALARM_PRIORITY,
    ALARM_NOTIFICATION_DISPLAY_MS,
    PROGRESS_NOTIFICATION_DISPLAY_MS
} from '../clock/constants';

export class AlarmManager implements vscode.Disposable {
    private readonly context: vscode.ExtensionContext;
    private readonly statusBars: vscode.StatusBarItem[];
    private readonly alarmStatusBar: vscode.StatusBarItem;
    private alarm: AlarmSettings | undefined;
    private lastNotificationTimeMs: number = 0;
    private readonly i18n: I18nManager;
    private isDisposed: boolean = false;
    private flashDisposable: vscode.Disposable | undefined;

    constructor(context: vscode.ExtensionContext, statusBars: vscode.StatusBarItem[]) {
        this.context = context;
        this.statusBars = statusBars;
        this.alarm = this.loadAlarmFromGlobalState();
        this.i18n = I18nManager.getInstance();

        // アラーム設定用のステータスバーを作成
        this.alarmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_ALARM_PRIORITY);
        this.alarmStatusBar.command = 'otak-clock.listAlarms';
        this.updateAlarmStatusBar();
        this.alarmStatusBar.show();
    }

    private sameAlarm(a: AlarmSettings | undefined, b: AlarmSettings | undefined): boolean {
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.enabled === b.enabled
            && a.hour === b.hour
            && a.minute === b.minute
            && a.triggered === b.triggered
            && a.lastTriggeredOn === b.lastTriggeredOn;
    }

    private loadAlarmFromGlobalState(): AlarmSettings | undefined {
        const rawConfig = this.context.globalState.get<unknown>(ALARM_CONFIG_KEY);
        const config = validateAlarmConfig(rawConfig);
        if (config) {
            // Runtime state is stored locally (not synced). Use a time signature to detect
            // time changes (including via Settings Sync) and reset runtime safely.
            const signature = formatTime(config.hour, config.minute);

            const rawRuntime = this.context.globalState.get<unknown>(ALARM_RUNTIME_KEY);
            const validated = validateAlarmRuntime(rawRuntime);
            let runtime: AlarmRuntime = validated ?? { triggered: false };

            if (runtime.timeSignature === undefined) {
                runtime = { ...runtime, timeSignature: signature };
                void this.context.globalState.update(ALARM_RUNTIME_KEY, runtime);
            } else if (runtime.timeSignature !== signature) {
                runtime = { triggered: false, timeSignature: signature };
                void this.context.globalState.update(ALARM_RUNTIME_KEY, runtime);
            }

            const merged: AlarmSettings = {
                ...config,
                triggered: runtime.triggered
            };
            if (typeof runtime.lastTriggeredOn === 'string') {
                merged.lastTriggeredOn = runtime.lastTriggeredOn;
            }

            // Clean up legacy storage if it exists.
            if (this.context.globalState.get<unknown>(LEGACY_ALARM_STATE_KEY) !== undefined) {
                void this.context.globalState.update(LEGACY_ALARM_STATE_KEY, undefined);
            }
            return merged;
        }

        // If config is missing, attempt to migrate legacy storage (config + runtime in one object).
        const legacyRaw = this.context.globalState.get<unknown>(LEGACY_ALARM_STATE_KEY);
        const legacy = validateAlarmSettings(legacyRaw);
        if (!legacy) {
            return undefined;
        }

        void this.context.globalState.update(ALARM_CONFIG_KEY, toAlarmConfig(legacy));
        void this.context.globalState.update(ALARM_RUNTIME_KEY, toAlarmRuntime(legacy));
        void this.context.globalState.update(LEGACY_ALARM_STATE_KEY, undefined);
        return legacy;
    }

    private refreshFromGlobalState(): void {
        const next = this.loadAlarmFromGlobalState();
        if (this.sameAlarm(this.alarm, next)) {
            return;
        }

        this.alarm = next;
        this.updateAlarmStatusBar();
    }

    /**
     * アラーム設定を保存
     */
    private saveAlarm(alarm: AlarmSettings | undefined): void {
        this.alarm = alarm;
        if (!alarm) {
            void this.context.globalState.update(ALARM_CONFIG_KEY, undefined);
            void this.context.globalState.update(ALARM_RUNTIME_KEY, undefined);
        } else {
            const config: AlarmConfig = toAlarmConfig(alarm);
            const runtime: AlarmRuntime = toAlarmRuntime(alarm);
            void this.context.globalState.update(ALARM_CONFIG_KEY, config);
            void this.context.globalState.update(ALARM_RUNTIME_KEY, runtime);
        }
        // Always clear legacy storage if present.
        void this.context.globalState.update(LEGACY_ALARM_STATE_KEY, undefined);
        this.updateAlarmStatusBar();
    }

    private async promptForAlarmTime(initialValue?: string): Promise<{ hour: number; minute: number } | undefined> {
        const timeInput = await vscode.window.showInputBox({
            prompt: this.i18n.t('alarm.input.prompt'),
            placeHolder: this.i18n.t('alarm.input.placeholder'),
            value: initialValue,
            validateInput: (value) => {
                return ALARM_TIME_REGEX.test(value) ? null : this.i18n.t('alarm.input.invalidFormat');
            }
        });

        if (!timeInput) {
            return undefined;
        }

        const [hour, minute] = timeInput.split(':').map(Number);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
            return undefined;
        }

        return { hour, minute };
    }

    /**
     * 新しいアラームを設定
     */
    async setAlarm(): Promise<void> {
        const picked = await this.promptForAlarmTime();
        if (!picked) {
            return;
        }

        const alarm: AlarmSettings = {
            ...createDefaultAlarm(),
            hour: picked.hour,
            minute: picked.minute,
            triggered: false,
            lastTriggeredOn: undefined
        };

        this.saveAlarm(alarm);

        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.set', { time: formatTime(picked.hour, picked.minute) }),
            cancellable: false
        }, () => sleep(PROGRESS_NOTIFICATION_DISPLAY_MS));
    }

    async editAlarm(): Promise<void> {
        const alarm = this.alarm;
        if (!alarm) {
            return this.setAlarm();
        }

        const picked = await this.promptForAlarmTime(formatTime(alarm.hour, alarm.minute));
        if (!picked) {
            return;
        }

        const updated: AlarmSettings = {
            ...alarm,
            hour: picked.hour,
            minute: picked.minute,
            triggered: false,
            lastTriggeredOn: undefined
        };
        this.saveAlarm(updated);

        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.updated', { time: formatTime(picked.hour, picked.minute) }),
            cancellable: false
        }, () => sleep(PROGRESS_NOTIFICATION_DISPLAY_MS));
    }

    async toggleAlarm(): Promise<void> {
        const alarm = this.alarm;
        if (!alarm) {
            const setAlarmLabel = this.i18n.t('alarm.action.setAlarm');
            const action = await vscode.window.showInformationMessage(this.i18n.t('alarm.message.noAlarmSet'), setAlarmLabel);
            if (action === setAlarmLabel) {
                await this.setAlarm();
            }
            return;
        }

        const updated: AlarmSettings = { ...alarm, enabled: !alarm.enabled };
        this.saveAlarm(updated);

        const message = updated.enabled
            ? this.i18n.t('alarm.message.enabled', { time: formatTime(updated.hour, updated.minute) })
            : this.i18n.t('alarm.message.disabled');
        void vscode.window.showInformationMessage(message);
    }

    async deleteAlarm(): Promise<void> {
        const alarm = this.alarm;
        if (!alarm) {
            void vscode.window.showInformationMessage(this.i18n.t('alarm.message.noAlarmSet'));
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            this.i18n.t('alarm.confirm.delete', { time: formatTime(alarm.hour, alarm.minute) }),
            { modal: true },
            this.i18n.t('alarm.action.delete')
        );

        if (confirmation !== this.i18n.t('alarm.action.delete')) {
            return;
        }

        this.saveAlarm(undefined);
        void vscode.window.showInformationMessage(this.i18n.t('alarm.message.deleted'));
    }

    async showAlarmMenu(): Promise<void> {
        this.refreshFromGlobalState();

        type AlarmAction = 'set' | 'toggle' | 'edit' | 'delete';
        type AlarmMenuItem = vscode.QuickPickItem & { action: AlarmAction };

        const alarm = this.alarm;
        const time = alarm ? formatTime(alarm.hour, alarm.minute) : undefined;
        const status = alarm
            ? (alarm.enabled ? this.i18n.t('alarm.status.enabled') : this.i18n.t('alarm.status.disabled'))
            : this.i18n.t('alarm.status.notSet');
        const fired = alarm?.enabled && alarm.triggered ? this.i18n.t('alarm.status.firedTodaySuffix') : '';

        const items: AlarmMenuItem[] = [];
        if (!alarm) {
            items.push({
                label: this.i18n.t('command.setAlarm'),
                description: this.i18n.t('alarm.menu.createDescription'),
                action: 'set'
            });
        } else {
            items.push({
                label: alarm.enabled ? this.i18n.t('alarm.menu.disable') : this.i18n.t('alarm.menu.enable'),
                description: time,
                action: 'toggle'
            });
            items.push({ label: this.i18n.t('command.editAlarm'), description: time, action: 'edit' });
            items.push({ label: this.i18n.t('command.deleteAlarm'), description: time, action: 'delete' });
        }

        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: this.i18n.t('alarm.menu.placeholder', { time: time ?? '—', status, fired })
        });

        if (!picked) {
            return;
        }

        switch (picked.action) {
            case 'set':
                await this.setAlarm();
                break;
            case 'toggle':
                await this.toggleAlarm();
                break;
            case 'edit':
                await this.editAlarm();
                break;
            case 'delete':
                await this.deleteAlarm();
                break;
            default:
                break;
        }
    }

    /**
     * 1分に1回呼び出される想定のティック処理
     */
    tick(now: Date): void {
        this.refreshFromGlobalState();

        const alarm = this.alarm;
        if (!alarm) {
            return;
        }

        const result = evaluateAlarmTick(alarm, now, this.lastNotificationTimeMs);

        switch (result.action) {
            case 'none':
                break;
            case 'save':
                this.saveAlarm(result.alarm);
                break;
            case 'trigger':
                this.lastNotificationTimeMs = now.getTime();
                this.triggerAlarm(result.alarm, result.todayKey);
                break;
        }
    }

    /**
     * アラームを発動
     */
    private triggerAlarm(alarm: AlarmSettings, todayKey: string): void {
        if (this.isDisposed) {
            return;
        }

        const updated: AlarmSettings = {
            ...alarm,
            triggered: true,
            lastTriggeredOn: todayKey
        };
        this.saveAlarm(updated);

        // 5秒で自動的に消える通知を表示
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.notification.title', { time: formatTime(alarm.hour, alarm.minute) }),
            cancellable: false
        }, () => sleep(ALARM_NOTIFICATION_DISPLAY_MS));

        // ステータスバーを点滅
        this.flashDisposable?.dispose();
        this.flashDisposable = flashStatusBars(this.statusBars);
    }

    /**
     * ステータスバーの表示を更新
     */
    private updateAlarmStatusBar(): void {
        const state = buildAlarmStatusBarState(this.alarm, this.i18n);
        this.alarmStatusBar.text = state.text;
        this.alarmStatusBar.tooltip = state.tooltip;
    }

    /**
     * リソースの解放
     */
    dispose(): void {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.flashDisposable?.dispose();
        this.alarmStatusBar.dispose();
    }
}
