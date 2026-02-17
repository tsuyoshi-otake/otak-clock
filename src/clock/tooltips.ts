import { FormatterPair, TimeZoneInfo } from '../timezone/types';
import { formatUtcOffsetLabel, getUtcOffsetMinutes } from '../timezone/offsets';
import { I18nManager } from '../i18n/I18nManager';

export function buildTooltipText(
    now: Date,
    timeZone: TimeZoneInfo,
    formatters: FormatterPair,
    i18n: I18nManager
): string {
    const dateStr = formatters.date.format(now);
    const baseOffsetMinutes = Math.round(timeZone.baseUtcOffset * 60);
    const offsetMinutes = getUtcOffsetMinutes(now, timeZone.timeZoneId);
    const dstInfo = offsetMinutes !== baseOffsetMinutes
        ? i18n.t('clock.dstInfo', { base: formatUtcOffsetLabel(baseOffsetMinutes) })
        : '';
    return `${timeZone.label} (${timeZone.timeZoneId})\n${dateStr} ${formatUtcOffsetLabel(offsetMinutes)}${dstInfo}\n${i18n.t('clock.tooltip.clickToChange')}`;
}

export function formatClockText(
    now: Date,
    timeZone: TimeZoneInfo,
    formatters: FormatterPair,
    isFocused: boolean,
    showTimeZoneInStatusBar: boolean,
    getLabel: (now: Date, timeZone: TimeZoneInfo, formatters: FormatterPair) => string
): string {
    const time = (isFocused ? formatters.timeWithSeconds : formatters.timeNoSeconds).format(now);
    if (showTimeZoneInStatusBar) {
        return `${time} ${getLabel(now, timeZone, formatters)}`;
    }
    return time;
}
