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
        this.alarmStatusBar.command = 'otak-clock.setAlarm';
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

    /**
     * 新しいアラームを設定
     */
    async setAlarm(): Promise<void> {
        const timeInput = await vscode.window.showInputBox({
            prompt: 'Set alarm time (HH:mm)',
            placeHolder: 'e.g., 09:00',
            validateInput: (value) => {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                return timeRegex.test(value) ? null : 'Please enter a valid time format (HH:mm)';
            }
        });

        if (!timeInput) {
            return;
        }

        const [hour, minute] = timeInput.split(':').map(Number);
        const alarm = createDefaultAlarm();
        alarm.hour = hour;
        alarm.minute = minute;

        this.saveAlarm(alarm);

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Alarm set for ${formatTime(hour, minute)}`,
            cancellable: false
        }, () => new Promise(resolve => setTimeout(resolve, 3000)));
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

        if (alarm?.enabled && !alarm.triggered) {
            this.alarmStatusBar.text = `$(bell) ${formatTime(alarm.hour, alarm.minute)}`;
            this.alarmStatusBar.tooltip = `Alarm set for ${formatTime(alarm.hour, alarm.minute)}\nClick to change`;
        } else {
            this.alarmStatusBar.text = '$(bell) $(add)';
            this.alarmStatusBar.tooltip = 'Click to set alarm';
        }
    }

    /**
     * リソースの解放
     */
    dispose(): void {
        this.alarmStatusBar.dispose();
    }
}
