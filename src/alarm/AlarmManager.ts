import * as vscode from 'vscode';
import { flashStatusBars } from '../utils/color';
import { AlarmSettings, createDefaultAlarm, formatTime } from './AlarmSettings';
import { I18nManager } from '../i18n/I18nManager';

function toLocalDateKey(now: Date): string {
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export class AlarmManager implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private statusBars: vscode.StatusBarItem[];
    private alarmStatusBar: vscode.StatusBarItem;
    private alarm: AlarmSettings | undefined;
    private lastNotificationTime: number = 0;
    private i18n: I18nManager;

    constructor(context: vscode.ExtensionContext, statusBars: vscode.StatusBarItem[]) {
        this.context = context;
        this.statusBars = statusBars;
        this.alarm = this.context.globalState.get<AlarmSettings>('alarm');
        this.i18n = I18nManager.getInstance();

        // アラーム設定用のステータスバーを作成
        this.alarmStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.alarmStatusBar.command = 'otak-clock.listAlarms';
        this.updateAlarmStatusBar();
        this.alarmStatusBar.show();

        context.subscriptions.push(this.alarmStatusBar);
    }

    /**
     * アラーム設定を取得
     */
    private getAlarm(): AlarmSettings | undefined {
        return this.alarm;
    }

    /**
     * アラーム設定を保存
     */
    private saveAlarm(alarm: AlarmSettings | undefined): void {
        this.alarm = alarm;
        void this.context.globalState.update('alarm', alarm);
        this.updateAlarmStatusBar();
    }

    private async promptForAlarmTime(initialValue?: string): Promise<{ hour: number; minute: number } | undefined> {
        const timeInput = await vscode.window.showInputBox({
            prompt: this.i18n.t('alarm.input.prompt'),
            placeHolder: this.i18n.t('alarm.input.placeholder'),
            value: initialValue,
            validateInput: (value) => {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                return timeRegex.test(value) ? null : this.i18n.t('alarm.input.invalidFormat');
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

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.set', { time: formatTime(picked.hour, picked.minute) }),
            cancellable: false
        }, () => new Promise(resolve => setTimeout(resolve, 3000)));
    }

    async editAlarm(): Promise<void> {
        const alarm = this.getAlarm();
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

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.message.updated', { time: formatTime(picked.hour, picked.minute) }),
            cancellable: false
        }, () => new Promise(resolve => setTimeout(resolve, 3000)));
    }

    async toggleAlarm(): Promise<void> {
        const alarm = this.getAlarm();
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
        const alarm = this.getAlarm();
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

        const alarm = this.getAlarm();
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
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const alarm = this.getAlarm();
        if (!alarm || !alarm.enabled) {
            return;
        }

        // Reset "triggered" when the local day changes. This works even if VS Code
        // was closed at midnight.
        const todayKey = toLocalDateKey(now);
        if (alarm.triggered) {
            if (!alarm.lastTriggeredOn) {
                // Migration: older versions didn't track the date. Infer whether we should
                // allow the alarm to trigger today.
                const alarmMinuteOfDay = alarm.hour * 60 + alarm.minute;
                const currentMinuteOfDay = currentHour * 60 + currentMinute;

                if (currentMinuteOfDay <= alarmMinuteOfDay) {
                    // It's not past today's alarm time yet, so treat this as a carry-over
                    // from a previous day and allow the alarm to trigger again today.
                    alarm.triggered = false;
                    this.saveAlarm(alarm);
                } else {
                    // Today's alarm time already passed. Treat this as already triggered today
                    // to avoid firing unexpectedly after an upgrade.
                    alarm.lastTriggeredOn = todayKey;
                    this.saveAlarm(alarm);
                    return;
                }
            }

            if (alarm.lastTriggeredOn !== todayKey) {
                alarm.triggered = false;
                this.saveAlarm(alarm);
            }
        }

        if (alarm.triggered) {
            return;
        }

        if (alarm.hour === currentHour && alarm.minute === currentMinute) {
            // 同じ分内での重複通知を防ぐ
            const currentTime = Date.now();
            if (currentTime - this.lastNotificationTime < 60000) {
                return;
            }
            this.lastNotificationTime = currentTime;
            this.triggerAlarm(alarm, todayKey);
        }
    }

    /**
     * アラームを発動
     */
    private triggerAlarm(alarm: AlarmSettings, todayKey: string): void {
        // 5秒で自動的に消える通知を表示
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.i18n.t('alarm.notification.title', { time: formatTime(alarm.hour, alarm.minute) }),
            cancellable: false
        }, () => new Promise(resolve => {
            alarm.triggered = true;
            alarm.lastTriggeredOn = todayKey;
            this.saveAlarm(alarm);
            setTimeout(resolve, 5000);
        }));

        // ステータスバーを点滅
        flashStatusBars(this.statusBars);
    }

    /**
     * ステータスバーの表示を更新
     */
    private updateAlarmStatusBar(): void {
        const alarm = this.getAlarm();

        if (!alarm) {
            this.alarmStatusBar.text = '$(bell) $(add)';
            this.alarmStatusBar.tooltip = [
                this.i18n.t('alarm.statusBar.noAlarmSet'),
                this.i18n.t('alarm.statusBar.clickToManage')
            ].join('\n');
            return;
        }

        const time = formatTime(alarm.hour, alarm.minute);
        this.alarmStatusBar.text = alarm.enabled ? `$(bell) ${time}` : `$(bell-slash) ${time}`;

        const status = alarm.enabled ? this.i18n.t('alarm.status.enabled') : this.i18n.t('alarm.status.disabled');
        const lines: string[] = [
            this.i18n.t('alarm.statusBar.alarm', { time }),
            this.i18n.t('alarm.statusBar.status', { status })
        ];
        if (alarm.enabled && alarm.triggered) {
            lines.push(this.i18n.t('alarm.statusBar.triggeredToday'));
        }
        lines.push(this.i18n.t('alarm.statusBar.clickToManage'));
        this.alarmStatusBar.tooltip = lines.join('\n');
    }

    /**
     * リソースの解放
     */
    dispose(): void {
        this.alarmStatusBar.dispose();
    }
}
