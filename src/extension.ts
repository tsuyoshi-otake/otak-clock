// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { ClockController } from './clock/ClockController';
import { AlarmManager } from './alarm/AlarmManager';
import { I18nManager } from './i18n/I18nManager';
import { ALARM_CONFIG_KEY } from './alarm/constants';
import { selectTimeZoneWithRegion } from './timezone/picker';
import { TimeZoneInfo } from './timezone/types';
import {
    STATUS_BAR_PRIMARY_PRIORITY,
    STATUS_BAR_SECONDARY_PRIORITY,
    TIME_ZONE_1_KEY,
    TIME_ZONE_2_KEY
} from './clock/constants';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
    // Initialize i18n early so all UI strings use the detected locale.
    I18nManager.getInstance().initialize();

    // Settings Sync: keep time zones and the alarm config in sync across devices.
    context.globalState.setKeysForSync([TIME_ZONE_1_KEY, TIME_ZONE_2_KEY, ALARM_CONFIG_KEY]);

    const registerCommand = (command: string, handler: (...args: unknown[]) => unknown): void => {
        context.subscriptions.push(vscode.commands.registerCommand(command, handler));
    };

    const selectTimeZoneAndApply = async (apply: (timeZone: TimeZoneInfo) => void): Promise<void> => {
        const selectedTimeZone = await selectTimeZoneWithRegion();
        if (selectedTimeZone) {
            apply(selectedTimeZone);
        }
    };

    // ステータスバーアイテムを作成
    const primaryStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_PRIMARY_PRIORITY);
    primaryStatusBar.command = 'otak-clock.selectTimeZone1';
    context.subscriptions.push(primaryStatusBar);

    const secondaryStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_SECONDARY_PRIORITY);
    secondaryStatusBar.command = 'otak-clock.selectTimeZone2';
    context.subscriptions.push(secondaryStatusBar);

    // アラームマネージャーを初期化
    const alarmManager = new AlarmManager(context, [primaryStatusBar, secondaryStatusBar]);
    context.subscriptions.push(alarmManager);

    const clockController = new ClockController(context, primaryStatusBar, secondaryStatusBar, alarmManager);
    context.subscriptions.push(clockController);

    // コマンドを登録
    registerCommand('otak-clock.selectTimeZone1', () => selectTimeZoneAndApply((tz) => clockController.setTimeZone1(tz)));
    registerCommand('otak-clock.selectTimeZone2', () => selectTimeZoneAndApply((tz) => clockController.setTimeZone2(tz)));
    registerCommand('otak-clock.swapTimeZones', () => clockController.swapTimeZones());

    // アラーム関連のコマンドを登録
    registerCommand('otak-clock.setAlarm', () => alarmManager.setAlarm());
    registerCommand('otak-clock.toggleAlarm', () => alarmManager.toggleAlarm());
    registerCommand('otak-clock.editAlarm', () => alarmManager.editAlarm());
    registerCommand('otak-clock.deleteAlarm', () => alarmManager.deleteAlarm());
    registerCommand('otak-clock.listAlarms', () => alarmManager.showAlarmMenu());

    // 表示
    primaryStatusBar.show();
    secondaryStatusBar.show();
}

// This method is called when your extension is deactivated
export function deactivate(): void {
    // All resources are disposed via `context.subscriptions`.
}
