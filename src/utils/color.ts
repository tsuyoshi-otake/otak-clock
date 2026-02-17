import * as vscode from 'vscode';
import { FLASH_INTERVAL_MS } from '../clock/constants';

/**
 * ヘルパー関数：16進数カラー文字列を RGB オブジェクトに変換
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) {
        return null;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
        return null;
    }
    return { r, g, b };
}

/**
 * RGB オブジェクトを 16 進数カラー文字列に変換
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
        .map(c => c.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * RGB を HSL に変換
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0));
                break;
            case g:
                h = ((b - r) / d + 2);
                break;
            case b:
                h = ((r - g) / d + 4);
                break;
        }
        h *= 60;
    }
    return { h, s, l };
}

/**
 * HSL を RGB に変換
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l * 255;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) {
                t += 1;
            }
            if (t > 1) {
                t -= 1;
            }
            if (t < 1 / 6) {
                return p + (q - p) * 6 * t;
            }
            if (t < 1 / 2) {
                return q;
            }
            if (t < 2 / 3) {
                return p + (q - p) * (2 / 3 - t) * 6;
            }
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, (h / 360) + 1/3) * 255;
        g = hue2rgb(p, q, h / 360) * 255;
        b = hue2rgb(p, q, (h / 360) - 1/3) * 255;
    }
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/**
 * ステータスバーの色を点滅させる
 */
export function flashStatusBars(statusBars: vscode.StatusBarItem[], repeatCount: number = 3): vscode.Disposable {
    let count = 0;
    const interval = setInterval(() => {
        const isWarning = count % 2 === 0;
        statusBars.forEach(bar => {
            bar.backgroundColor = isWarning ?
                new vscode.ThemeColor('statusBarItem.warningBackground') :
                undefined;
        });
        count++;
        if (count >= repeatCount * 2) {
            clearInterval(interval);
            statusBars.forEach(bar => {
                bar.backgroundColor = undefined;
            });
        }
    }, FLASH_INTERVAL_MS);

    return new vscode.Disposable(() => {
        clearInterval(interval);
        statusBars.forEach(bar => {
            bar.backgroundColor = undefined;
        });
    });
}
