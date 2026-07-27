import * as vscode from 'vscode';
import { TimeZoneInfo } from '../timezone/types';
import { findTimeZoneById, UTC_FALLBACK_TIMEZONE } from '../timezone/data';
import { I18nManager } from '../i18n/I18nManager';
import { getZoneMinuteState } from '../timezone/formatters';
import { ClockBar } from './ClockBar';
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
    private readonly primaryBar: ClockBar;
    private readonly secondaryBar: ClockBar;
    /** Injected callback fired once per minute boundary; drives alarm evaluation. */
    private readonly onMinuteTick: (now: Date) => void;
    private readonly i18n: I18nManager;

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
        onMinuteTick: (now: Date) => void
    ) {
        this.context = context;
        this.onMinuteTick = onMinuteTick;
        this.i18n = I18nManager.getInstance();

        this.isFocused = vscode.window.state.focused;

        this.primaryBar = new ClockBar(primaryStatusBar, this.loadTimeZone(TIME_ZONE_1_KEY, DEFAULT_TIME_ZONE_1_ID));
        this.secondaryBar = new ClockBar(secondaryStatusBar, this.loadTimeZone(TIME_ZONE_2_KEY, DEFAULT_TIME_ZONE_2_ID));

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
            this.refresh();
        });

        this.windowStateDisposable = vscode.window.onDidChangeWindowState((e) => {
            this.isFocused = e.focused;

            const nowMs = Date.now();
            this.runMinuteTick(nowMs, false);
            // Switch between HH:mm:ss (focused) and HH:mm (unfocused) immediately.
            this.renderText(nowMs);
            if (this.isFocused) {
                this.renderTooltips(nowMs);
            }

            this.scheduleNextTick(true);
        });

        this.refresh();
        this.scheduleNextTick(true);
    }

    setTimeZone1(timeZone: TimeZoneInfo): void {
        this.applyTimeZone(this.primaryBar, TIME_ZONE_1_KEY, timeZone);
    }

    setTimeZone2(timeZone: TimeZoneInfo): void {
        this.applyTimeZone(this.secondaryBar, TIME_ZONE_2_KEY, timeZone);
    }

    swapTimeZones(): void {
        const primary = this.primaryBar.getTimeZone();
        this.applyTimeZone(this.primaryBar, TIME_ZONE_1_KEY, this.secondaryBar.getTimeZone());
        this.applyTimeZone(this.secondaryBar, TIME_ZONE_2_KEY, primary);
    }

    private applyTimeZone(bar: ClockBar, key: string, timeZone: TimeZoneInfo): void {
        if (!bar.setTimeZone(timeZone)) {
            return;
        }
        void this.context.globalState.update(key, timeZone.timeZoneId);
        this.refresh();
    }

    private loadTimeZone(key: string, fallbackId: string): TimeZoneInfo {
        const fallback = findTimeZoneById(fallbackId) ?? UTC_FALLBACK_TIMEZONE;

        const stored = this.context.globalState.get<unknown>(key);
        const storedId = coerceTimeZoneId(stored);
        const timeZone = storedId ? findTimeZoneById(storedId) : undefined;

        if (timeZone) {
            // Validate that the runtime supports the IANA timeZoneId.
            try {
                void getZoneMinuteState(Date.now(), timeZone.timeZoneId);
                // Migrate old versions that stored the entire object to a string ID.
                if (typeof stored !== 'string') {
                    void this.context.globalState.update(key, timeZone.timeZoneId);
                }
                return timeZone;
            } catch {
                // Fall through to the default below.
            }
        }

        void this.context.globalState.update(key, fallback.timeZoneId);
        return fallback;
    }

    /** Full redraw: text, tooltips and the alarm tick, regardless of what changed. */
    private refresh(): void {
        const nowMs = Date.now();
        this.primaryBar.invalidate();
        this.secondaryBar.invalidate();
        this.renderText(nowMs);
        this.runMinuteTick(nowMs, true);
        this.renderTooltips(nowMs);
    }

    private onTick(): void {
        this.tickHandle = undefined;
        if (this.isDisposed) {
            return;
        }

        // Date.now() rather than `new Date()`: the per-second path never needs a Date object,
        // and one is only constructed on the minute boundary where the alarm tick wants it.
        const nowMs = Date.now();
        this.runMinuteTick(nowMs, false);
        this.renderText(nowMs);

        this.scheduleNextTick(false);
    }

    private runMinuteTick(nowMs: number, force: boolean): void {
        const minuteBucket = Math.floor(nowMs / MS_PER_MINUTE);
        if (!force && this.lastMinuteBucket === minuteBucket) {
            return;
        }
        this.lastMinuteBucket = minuteBucket;

        // Drives alarm evaluation (injected). Runs even when the window is unfocused.
        this.onMinuteTick(new Date(nowMs));

        if (this.isFocused) {
            this.renderTooltips(nowMs);
        }
    }

    private renderText(nowMs: number): void {
        this.primaryBar.renderText(nowMs, this.isFocused, this.showTimeZoneInStatusBar);
        this.secondaryBar.renderText(nowMs, this.isFocused, this.showTimeZoneInStatusBar);
    }

    private renderTooltips(nowMs: number): void {
        this.primaryBar.renderTooltip(nowMs, this.i18n);
        this.secondaryBar.renderTooltip(nowMs, this.i18n);
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
