import { TimeZoneInfo } from '../timezone/types';
import { ZoneMinuteState } from '../timezone/formatters';
import { applyBaseOffsetFallback, formatUtcOffsetLabel, getBaseUtcOffsetMinutes } from '../timezone/offsets';
import { I18nManager } from '../i18n/I18nManager';

/**
 * Builds the status bar tooltip for a clock.
 *
 * Everything time-dependent comes from the already-resolved `state`, so this is pure string
 * assembly - no Intl work, and nothing that needs the raw instant.
 */
export function buildTooltipText(
    state: ZoneMinuteState,
    timeZone: TimeZoneInfo,
    i18n: I18nManager
): string {
    const baseOffsetMinutes = getBaseUtcOffsetMinutes(timeZone);
    const offsetMinutes = applyBaseOffsetFallback(state.offsetMinutes, timeZone);
    const dstInfo = offsetMinutes !== baseOffsetMinutes
        ? i18n.t('clock.dstInfo', { base: formatUtcOffsetLabel(baseOffsetMinutes) })
        : '';
    return `${timeZone.label} (${timeZone.timeZoneId})\n${state.dateText} ${formatUtcOffsetLabel(offsetMinutes)}${dstInfo}\n${i18n.t('clock.tooltip.clickToChange')}`;
}
