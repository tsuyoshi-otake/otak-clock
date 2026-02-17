import * as vscode from 'vscode';
import { FLASH_INTERVAL_MS } from '../clock/constants';

/**
 * Flashes the status bar background color a few times to get attention.
 */
export function flashStatusBars(statusBars: vscode.StatusBarItem[], repeatCount = 3): vscode.Disposable {
    let count = 0;
    const interval = setInterval(() => {
        const isWarning = count % 2 === 0;
        for (const bar of statusBars) {
            bar.backgroundColor = isWarning
                ? new vscode.ThemeColor('statusBarItem.warningBackground')
                : undefined;
        }

        count++;
        if (count >= repeatCount * 2) {
            clearInterval(interval);
            for (const bar of statusBars) {
                bar.backgroundColor = undefined;
            }
        }
    }, FLASH_INTERVAL_MS);

    return new vscode.Disposable(() => {
        clearInterval(interval);
        for (const bar of statusBars) {
            bar.backgroundColor = undefined;
        }
    });
}

