import * as vscode from 'vscode';
import { flashStatusBars } from '../utils/color';
import { AlarmSettings, createDefaultAlarm, formatTime } from './AlarmSettings';

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

    constructor(context: vscode.ExtensionContext, statusBars: vscode.StatusBarItem[]) {
        this.context = context;
        this.statusBars = statusBars;
        this.alarm = this.context.globalState.get<AlarmSettings>('alarm');

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
            prompt: 'Set alarm time (HH:mm)',
            placeHolder: 'e.g., 09:00',
            value: initialValue,
            validateInput: (value) => {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                return timeRegex.test(value) ? null : 'Please enter a valid time format (HH:mm)';
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
            title: `Alarm set for ${formatTime(picked.hour, picked.minute)}`,
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
            title: `Alarm updated to ${formatTime(picked.hour, picked.minute)}`,
            cancellable: false
        }, () => new Promise(resolve => setTimeout(resolve, 3000)));
    }

    async toggleAlarm(): Promise<void> {
        const alarm = this.getAlarm();
        if (!alarm) {
            const action = await vscode.window.showInformationMessage('No alarm set.', 'Set Alarm');
            if (action === 'Set Alarm') {
                await this.setAlarm();
            }
            return;
        }

        alarm.enabled = !alarm.enabled;
        this.saveAlarm(alarm);

        const message = alarm.enabled ? `Alarm enabled (${formatTime(alarm.hour, alarm.minute)})` : 'Alarm disabled';
        void vscode.window.showInformationMessage(message);
    }

    async deleteAlarm(): Promise<void> {
        const alarm = this.getAlarm();
        if (!alarm) {
            void vscode.window.showInformationMessage('No alarm set.');
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            `Delete alarm (${formatTime(alarm.hour, alarm.minute)})?`,
            { modal: true },
            'Delete'
        );

        if (confirmation !== 'Delete') {
            return;
        }

        this.saveAlarm(undefined);
        void vscode.window.showInformationMessage('Alarm deleted.');
    }

    async showAlarmMenu(): Promise<void> {
        type AlarmAction = 'set' | 'toggle' | 'edit' | 'delete';
        type AlarmMenuItem = vscode.QuickPickItem & { action: AlarmAction };

        const alarm = this.getAlarm();
        const time = alarm ? formatTime(alarm.hour, alarm.minute) : undefined;
        const status = alarm ? (alarm.enabled ? 'Enabled' : 'Disabled') : 'Not set';
        const fired = alarm?.enabled && alarm.triggered ? ' (Triggered today)' : '';

        const items: AlarmMenuItem[] = [];
        if (!alarm) {
            items.push({ label: 'Set Alarm Time', description: 'Create an alarm', action: 'set' });
        } else {
            items.push({
                label: alarm.enabled ? 'Disable Alarm' : 'Enable Alarm',
                description: time,
                action: 'toggle'
            });
            items.push({ label: 'Edit Alarm Time', description: time, action: 'edit' });
            items.push({ label: 'Delete Alarm', description: time, action: 'delete' });
        }

        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: `Alarm: ${time ?? '—'} (${status})${fired}`
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
            title: `Alarm: ${formatTime(alarm.hour, alarm.minute)}`,
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
            this.alarmStatusBar.tooltip = 'No alarm set\nClick to manage';
            return;
        }

        const time = formatTime(alarm.hour, alarm.minute);
        this.alarmStatusBar.text = alarm.enabled ? `$(bell) ${time}` : `$(bell-slash) ${time}`;

        const lines: string[] = [
            `Alarm: ${time}`,
            `Status: ${alarm.enabled ? 'Enabled' : 'Disabled'}`
        ];
        if (alarm.enabled && alarm.triggered) {
            lines.push('Triggered: Today');
        }
        lines.push('Click to manage');
        this.alarmStatusBar.tooltip = lines.join('\n');
    }

    /**
     * リソースの解放
     */
    dispose(): void {
        this.alarmStatusBar.dispose();
    }
}
