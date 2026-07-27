import * as vscode from 'vscode';
import { TimeZoneInfo } from '../timezone/types';
import { formatClockText, getTimeZoneShortLabel, getZoneMinuteState } from '../timezone/formatters';
import { buildTooltipText } from './tooltips';
import { I18nManager } from '../i18n/I18nManager';

/**
 * One status bar clock: owns its timezone plus the caches that let a per-second redraw stay
 * cheap.
 *
 * All three redraw inputs change at very different rates, so each is memoized at its own
 * rate rather than recomputed per tick:
 *
 *  - the zone's hour/minute/date/offset change once a minute (`ZoneMinuteState`)
 *  - the short zone label changes only when the offset does, i.e. at a DST transition
 *  - the tooltip changes only when the date or the offset does, i.e. about once a day
 *
 * What is left in the per-second path is an integer division for the seconds and one string
 * concatenation.
 */
export class ClockBar {
    private readonly item: vscode.StatusBarItem;
    private timeZone: TimeZoneInfo;

    private lastText: string | undefined;
    private lastTooltip: string | undefined;

    /** Offset the cached `label` was resolved for; only a DST transition invalidates it. */
    private labelOffsetMinutes: number | undefined;
    private label = '';
    /** Inputs the cached tooltip was built from; together they change about once a day. */
    private tooltipDateText: string | undefined;
    private tooltipOffsetMinutes: number | undefined;

    constructor(item: vscode.StatusBarItem, timeZone: TimeZoneInfo) {
        this.item = item;
        this.timeZone = timeZone;
    }

    getTimeZone(): TimeZoneInfo {
        return this.timeZone;
    }

    /** Returns true when the timezone actually changed. */
    setTimeZone(timeZone: TimeZoneInfo): boolean {
        if (timeZone.timeZoneId === this.timeZone.timeZoneId) {
            return false;
        }
        this.timeZone = timeZone;
        this.invalidate();
        return true;
    }

    /** Drops the memoized label/tooltip so the next render rebuilds them from scratch. */
    invalidate(): void {
        this.labelOffsetMinutes = undefined;
        this.tooltipDateText = undefined;
        this.tooltipOffsetMinutes = undefined;
    }

    renderText(timeMs: number, isFocused: boolean, showTimeZone: boolean): void {
        const state = getZoneMinuteState(timeMs, this.timeZone.timeZoneId);

        let label: string | undefined;
        if (showTimeZone) {
            if (this.labelOffsetMinutes !== state.offsetMinutes) {
                this.label = getTimeZoneShortLabel(this.timeZone.timeZoneId, state.offsetMinutes, timeMs);
                this.labelOffsetMinutes = state.offsetMinutes;
            }
            label = this.label;
        }

        const text = formatClockText(state, timeMs, isFocused, label);
        if (text !== this.lastText) {
            this.item.text = text;
            this.lastText = text;
        }
    }

    renderTooltip(timeMs: number, i18n: I18nManager): void {
        const state = getZoneMinuteState(timeMs, this.timeZone.timeZoneId);
        if (this.tooltipDateText === state.dateText && this.tooltipOffsetMinutes === state.offsetMinutes) {
            return;
        }
        this.tooltipDateText = state.dateText;
        this.tooltipOffsetMinutes = state.offsetMinutes;

        const tooltip = buildTooltipText(state, this.timeZone, i18n);
        if (tooltip !== this.lastTooltip) {
            this.item.tooltip = tooltip;
            this.lastTooltip = tooltip;
        }
    }
}
