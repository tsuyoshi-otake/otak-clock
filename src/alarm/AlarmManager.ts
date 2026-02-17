import * as vscode from 'vscode';
import { flashStatusBars } from '../utils/color';
import { ALARM_TIME_REGEX, AlarmSettings, createDefaultAlarm, formatTime, validateAlarmSettings } from './AlarmSettings';
import { buildAlarmStatusBarState } from './AlarmStatus';
import { toLocalDateKey, evaluateAlarmTick } from './alarmTick';
import { I18nManager } from '../i18n/I18nManager';
import {
    STATUS_BAR_ALARM_PRIORITY,
    ALARM_NOTIFICATION_DISPLAY_MS,
    PROGRESS_NOTIFICATION_DISPLAY_MS,
    ALARM_STATE_KEY
} from '../clock/constants';

export class AlarmManager implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private statusBars: vscode.StatusBarItem[];
    private alarmStatusBar: vscode.StatusBarItem;
    private alarm: AlarmSettings | undefined;
    private lastNotificationTime: number = 0;
    private i18n: I18nManager;
    private isDisposed: boolean = false;
    private flashDisposable: vscode.Disposable | undefined;

    constructor(context: vscode.ExtensionContext, statusBars: vscode.StatusBarItem[]) {
        this.context = context;
        this.statusBars = statusBars;
        this.alarm = validateAlarmSettings(this.context.globalState.get<unknown>(ALARM_STATE_KEY));
        this.i18n = I18nManager.getInstance();

        // アラーム設定用のステータスバーを作成
        this.alarmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_ALARM_PRIORITY);
        this.alarmStatusBar.command = 'otak-clock.listAlarms';
        this.updateAlarmStatusBar();
        this.alarmStatusBar.show();

        context.subscriptions.push(this.alarmStatusBar);
    }

    /**
     * アラーム設定を保存
     */
    private saveAlarm(alarm: AlarmSettings | undefined): void {
        this.alarm = alarm;
        void this.context.globalState.update(ALARM_STATE_KEY, alarm);
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

        const alarm = createDefaultAlarm();
        alarm.hour = picked.hour;
        alarm.minute = picked.minute;
        alarm.triggered = false;
        alarm.lastTriggeredOn = undefined;

        this.saveAlarm(alarm);

        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.set', { time: formatTime(picked.hour, picked.minute) }),
            cancellable: false
        }, () => new Promise(resolve => setTimeout(resolve, PROGRESS_NOTIFICATION_DISPLAY_MS)));
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
        }, () => new Promise(resolve => setTimeout(resolve, PROGRESS_NOTIFICATION_DISPLAY_MS)));
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

        alarm.enabled = !alarm.enabled;
        this.saveAlarm(alarm);

        const message = alarm.enabled
            ? this.i18n.t('alarm.message.enabled', { time: formatTime(alarm.hour, alarm.minute) })
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
        const alarm = this.alarm;
        if (!alarm) {
            return;
        }

        const todayKey = toLocalDateKey(now);
        const result = evaluateAlarmTick(
            alarm,
            now.getHours(),
            now.getMinutes(),
            todayKey,
            this.lastNotificationTime,
            Date.now()
        );

        switch (result.action) {
            case 'none':
                break;
            case 'save':
                this.saveAlarm(result.alarm);
                break;
            case 'trigger':
                this.lastNotificationTime = Date.now();
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

        // 5秒で自動的に消える通知を表示
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.notification.title', { time: formatTime(alarm.hour, alarm.minute) }),
            cancellable: false
        }, () => new Promise(resolve => {
            const updated: AlarmSettings = {
                ...alarm,
                triggered: true,
                lastTriggeredOn: todayKey
            };
            this.saveAlarm(updated);
            setTimeout(resolve, ALARM_NOTIFICATION_DISPLAY_MS);
        }));

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
