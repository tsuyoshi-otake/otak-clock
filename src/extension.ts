// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { ClockController } from './clock/ClockController';
import { AlarmManager } from './alarm/AlarmManager';
import { I18nManager } from './i18n/I18nManager';
import { selectTimeZoneWithRegion } from './timezone/picker';
import {
    STATUS_BAR_PRIMARY_PRIORITY,
    STATUS_BAR_SECONDARY_PRIORITY
} from './clock/constants';

let clockController: ClockController | undefined;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
    // Initialize i18n early so all UI strings use the detected locale.
    I18nManager.getInstance().initialize();

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

    clockController = new ClockController(context, primaryStatusBar, secondaryStatusBar, alarmManager);
    context.subscriptions.push(clockController);

    // コマンドを登録
    const disposable1 = vscode.commands.registerCommand('otak-clock.selectTimeZone1', async () => {
        const selectedTimeZone = await selectTimeZoneWithRegion();
        if (selectedTimeZone) {
            clockController?.setTimeZone1(selectedTimeZone);
        }
    });

    const disposable2 = vscode.commands.registerCommand('otak-clock.selectTimeZone2', async () => {
        const selectedTimeZone = await selectTimeZoneWithRegion();
        if (selectedTimeZone) {
            clockController?.setTimeZone2(selectedTimeZone);
        }
    });

    const disposableSwapTimeZones = vscode.commands.registerCommand('otak-clock.swapTimeZones', () => {
        clockController?.swapTimeZones();
    });

    // アラーム関連のコマンドを登録
    const disposableSetAlarm = vscode.commands.registerCommand('otak-clock.setAlarm', () => {
        return alarmManager.setAlarm();
    });
    const disposableToggleAlarm = vscode.commands.registerCommand('otak-clock.toggleAlarm', () => {
        return alarmManager.toggleAlarm();
    });

    const disposableEditAlarm = vscode.commands.registerCommand('otak-clock.editAlarm', () => {
        return alarmManager.editAlarm();
    });
    const disposableDeleteAlarm = vscode.commands.registerCommand('otak-clock.deleteAlarm', () => {
        return alarmManager.deleteAlarm();
    });
    const disposableListAlarms = vscode.commands.registerCommand('otak-clock.listAlarms', () => {
        return alarmManager.showAlarmMenu();
    });

    context.subscriptions.push(
        disposable1,
        disposable2,
        disposableSwapTimeZones,
        disposableSetAlarm,
        disposableToggleAlarm,
        disposableEditAlarm,
        disposableDeleteAlarm,
        disposableListAlarms
    );

    // 表示
    primaryStatusBar.show();
    secondaryStatusBar.show();
}

// This method is called when your extension is deactivated
export function deactivate(): void {
    if (clockController) {
        clockController.dispose();
        clockController = undefined;
    }
}
