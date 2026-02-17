import * as vscode from 'vscode';
import { TimeZoneInfo } from '../timezone/types';
import { findTimeZoneById, UTC_FALLBACK_TIMEZONE } from '../timezone/data';
import { AlarmManager } from '../alarm/AlarmManager';
import { I18nManager } from '../i18n/I18nManager';
import { getFormatters, getStatusBarTimeZoneLabel } from './formatters';
import { buildTooltipText, formatClockText } from './tooltips';
import { msUntilNextSecond, msUntilNextMinute, MS_PER_MINUTE } from '../utils/timing';
import { isRecord } from '../utils/guards';
import {
    TIME_ZONE_1_KEY,
    TIME_ZONE_2_KEY,
    DEFAULT_TIME_ZONE_1_ID,
    DEFAULT_TIME_ZONE_2_ID,
    SHOW_TIME_ZONE_IN_STATUS_BAR_SETTING
} from './constants';

function readShowTimeZoneInStatusBar(): boolean {
    return vscode.workspace.getConfiguration('otak-clock').get<boolean>('showTimeZoneInStatusBar', true);
}

export function coerceTimeZoneId(value: unknown): string | undefined {
    if (typeof value === 'string') {
        // Whitelist validation: only allow known time zone IDs
        return findTimeZoneById(value) ? value : undefined;
    }

    if (!isRecord(value)) {
        return undefined;
    }

    if (typeof value.timeZoneId !== 'string') {
        return undefined;
    }
    // Whitelist validation: only allow known time zone IDs
    return findTimeZoneById(value.timeZoneId) ? value.timeZoneId : undefined;
}

export class ClockController implements vscode.Disposable {
    private readonly context: vscode.ExtensionContext;
    private readonly primaryStatusBar: vscode.StatusBarItem;
    private readonly secondaryStatusBar: vscode.StatusBarItem;
    private readonly alarmManager: AlarmManager;
    private readonly i18n: I18nManager;

    private timeZone1: TimeZoneInfo;
    private timeZone2: TimeZoneInfo;

    private lastPrimaryText: string | undefined;
    private lastSecondaryText: string | undefined;
    private lastPrimaryTooltip: string | undefined;
    private lastSecondaryTooltip: string | undefined;

    private isFocused: boolean;
    private lastMinuteBucket: number | undefined;
    private tickHandle: NodeJS.Timeout | undefined;
    private readonly windowStateDisposable: vscode.Disposable;
    private readonly configurationDisposable: vscode.Disposable;
    private showTimeZoneInStatusBar: boolean;
    private isDisposed = false;

    constructor(
        context: vscode.ExtensionContext,
        primaryStatusBar: vscode.StatusBarItem,
        secondaryStatusBar: vscode.StatusBarItem,
        alarmManager: AlarmManager
    ) {
        this.context = context;
        this.primaryStatusBar = primaryStatusBar;
        this.secondaryStatusBar = secondaryStatusBar;
        this.alarmManager = alarmManager;
        this.i18n = I18nManager.getInstance();

        this.isFocused = vscode.window.state.focused;

        const loaded1 = this.loadTimeZone(TIME_ZONE_1_KEY, DEFAULT_TIME_ZONE_1_ID);
        this.timeZone1 = loaded1.timeZone;
        if (loaded1.needsPersist) {
            void this.context.globalState.update(TIME_ZONE_1_KEY, this.timeZone1.timeZoneId);
        }

        const loaded2 = this.loadTimeZone(TIME_ZONE_2_KEY, DEFAULT_TIME_ZONE_2_ID);
        this.timeZone2 = loaded2.timeZone;
        if (loaded2.needsPersist) {
            void this.context.globalState.update(TIME_ZONE_2_KEY, this.timeZone2.timeZoneId);
        }

        this.showTimeZoneInStatusBar = readShowTimeZoneInStatusBar();
        this.configurationDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (!e.affectsConfiguration(SHOW_TIME_ZONE_IN_STATUS_BAR_SETTING)) {
                return;
            }

            const next = readShowTimeZoneInStatusBar();
            if (next === this.showTimeZoneInStatusBar) {
                return;
            }

            this.showTimeZoneInStatusBar = next;
            this.refresh(true);
        });

        this.windowStateDisposable = vscode.window.onDidChangeWindowState((e) => {
            const wasFocused = this.isFocused;
            this.isFocused = e.focused;

            const now = new Date();
            this.runMinuteTick(now, false);
            // Switch between HH:mm:ss (focused) and HH:mm (unfocused) immediately.
            this.updateClockText(now, true);

            if (this.isFocused && !wasFocused) {
                this.updateTooltips(now, true);
            }

            this.scheduleNextTick(true);
        });

        this.refresh(true);
        this.scheduleNextTick(true);
    }

    setTimeZone1(timeZone: TimeZoneInfo): void {
        if (timeZone.timeZoneId === this.timeZone1.timeZoneId) {
            return;
        }

        this.timeZone1 = timeZone;
        void this.context.globalState.update(TIME_ZONE_1_KEY, timeZone.timeZoneId);
        this.refresh(true);
    }

    setTimeZone2(timeZone: TimeZoneInfo): void {
        if (timeZone.timeZoneId === this.timeZone2.timeZoneId) {
            return;
        }

        this.timeZone2 = timeZone;
        void this.context.globalState.update(TIME_ZONE_2_KEY, timeZone.timeZoneId);
        this.refresh(true);
    }

    swapTimeZones(): void {
        const tmp = this.timeZone1;
        this.timeZone1 = this.timeZone2;
        this.timeZone2 = tmp;

        void this.context.globalState.update(TIME_ZONE_1_KEY, this.timeZone1.timeZoneId);
        void this.context.globalState.update(TIME_ZONE_2_KEY, this.timeZone2.timeZoneId);
        this.refresh(true);
    }

    private loadTimeZone(key: string, fallbackId: string): { timeZone: TimeZoneInfo; needsPersist: boolean } {
        const fallback = findTimeZoneById(fallbackId) ?? UTC_FALLBACK_TIMEZONE;

        const stored = this.context.globalState.get<unknown>(key);
        const storedId = coerceTimeZoneId(stored);
        if (!storedId) {
            return { timeZone: fallback, needsPersist: true };
        }

        const timeZone = findTimeZoneById(storedId);
        if (!timeZone) {
            return { timeZone: fallback, needsPersist: true };
        }

        // Validate that the runtime supports the IANA timeZoneId.
        try {
            void getFormatters(timeZone.timeZoneId);
        } catch {
            return { timeZone: fallback, needsPersist: true };
        }

        const storedAsString = typeof stored === 'string';
        // Migrate old versions that stored the entire object to a string ID.
        return { timeZone, needsPersist: !storedAsString };
    }

    private refresh(forceTooltips: boolean): void {
        const now = new Date();
        this.updateClockText(now, true);
        this.runMinuteTick(now, true);
        this.updateTooltips(now, forceTooltips);
    }

    private onTick(): void {
        this.tickHandle = undefined;
        if (this.isDisposed) {
            return;
        }

        const now = new Date();
        this.runMinuteTick(now, false);
        this.updateClockText(now, false);

        this.scheduleNextTick(false);
    }

    private runMinuteTick(now: Date, force: boolean): void {
        const minuteBucket = Math.floor(now.getTime() / MS_PER_MINUTE);
        if (!force && this.lastMinuteBucket === minuteBucket) {
            return;
        }
        this.lastMinuteBucket = minuteBucket;

        // Alarm logic runs even when the VS Code window is not focused.
        this.alarmManager.tick(now);

        if (this.isFocused) {
            this.updateTooltips(now, false);
        }
    }

    private updateClockText(now: Date, force: boolean): void {
        const formatters1 = getFormatters(this.timeZone1.timeZoneId);
        const text1 = formatClockText(now, this.timeZone1, formatters1, this.isFocused, this.showTimeZoneInStatusBar, getStatusBarTimeZoneLabel);
        if (force || text1 !== this.lastPrimaryText) {
            this.primaryStatusBar.text = text1;
            this.lastPrimaryText = text1;
        }

        const formatters2 = getFormatters(this.timeZone2.timeZoneId);
        const text2 = formatClockText(now, this.timeZone2, formatters2, this.isFocused, this.showTimeZoneInStatusBar, getStatusBarTimeZoneLabel);
        if (force || text2 !== this.lastSecondaryText) {
            this.secondaryStatusBar.text = text2;
            this.lastSecondaryText = text2;
        }
    }

    private updateTooltips(now: Date, force: boolean): void {
        const tooltip1 = buildTooltipText(now, this.timeZone1, getFormatters(this.timeZone1.timeZoneId), this.i18n);
        if (force || tooltip1 !== this.lastPrimaryTooltip) {
            this.primaryStatusBar.tooltip = tooltip1;
            this.lastPrimaryTooltip = tooltip1;
        }

        const tooltip2 = buildTooltipText(now, this.timeZone2, getFormatters(this.timeZone2.timeZoneId), this.i18n);
        if (force || tooltip2 !== this.lastSecondaryTooltip) {
            this.secondaryStatusBar.tooltip = tooltip2;
            this.lastSecondaryTooltip = tooltip2;
        }
    }

    private scheduleNextTick(forceReschedule: boolean): void {
        if (this.isDisposed) {
            return;
        }

        if (forceReschedule && this.tickHandle) {
            clearTimeout(this.tickHandle);
            this.tickHandle = undefined;
        }

        if (this.tickHandle) {
            return;
        }

        const nowMs = Date.now();
        const delay = this.isFocused ? msUntilNextSecond(nowMs) : msUntilNextMinute(nowMs);

        this.tickHandle = setTimeout(() => this.onTick(), delay);
    }

    dispose(): void {
        if (this.isDisposed) {
            return;
        }

        this.isDisposed = true;
        if (this.tickHandle) {
            clearTimeout(this.tickHandle);
            this.tickHandle = undefined;
        }
        this.windowStateDisposable.dispose();
        this.configurationDisposable.dispose();
    }
}
