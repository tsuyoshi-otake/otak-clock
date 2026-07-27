import { TimeZoneInfo } from './types';
import { getZonedDateTime } from './zonedTime';
import { pad2 } from '../utils/digits';

export function formatUtcOffsetLabel(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const totalMinutes = Math.abs(offsetMinutes);
    return `UTC${sign}${pad2(Math.floor(totalMinutes / 60))}:${pad2(totalMinutes % 60)}`;
}

export function getBaseUtcOffsetMinutes(timeZone: TimeZoneInfo): number {
    return Math.round(timeZone.baseUtcOffset * 60);
}

/**
 * Applies the "Intl gave us nothing useful" guard to an already-resolved offset: an offset
 * of exactly 0 for a zone whose table entry says otherwise means the lookup failed (see
 * zonedTime.ts's UTC degradation), so the table's base offset is the better answer.
 *
 * Split out from `getEffectiveUtcOffsetMinutes` so callers that already hold the zone's
 * offset for the current minute do not pay for a second Intl resolution.
 */
export function applyBaseOffsetFallback(offsetMinutes: number, timeZone: TimeZoneInfo): number {
    const baseOffsetMinutes = getBaseUtcOffsetMinutes(timeZone);
    if (offsetMinutes === 0 && baseOffsetMinutes !== 0) {
        return baseOffsetMinutes;
    }
    return offsetMinutes;
}

export function getEffectiveUtcOffsetMinutes(date: Date, timeZone: TimeZoneInfo): number {
    try {
        return applyBaseOffsetFallback(getUtcOffsetMinutes(date, timeZone.timeZoneId), timeZone);
    } catch {
        return getBaseUtcOffsetMinutes(timeZone);
    }
}

/**
 * UTC offset (local - UTC, in minutes) for an instant in an IANA timezone.
 *
 * Backed by the shared formatter cache in zonedTime.ts, which resolves the offset from the
 * same single formatToParts() call that yields the zone's wall-clock fields.
 */
export function getUtcOffsetMinutes(date: Date, timeZoneId: string): number {
    return getZonedDateTime(date.getTime(), timeZoneId).offsetMinutes;
}
