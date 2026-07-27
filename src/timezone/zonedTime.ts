import { evictOldestIfOverCapacity, FORMATTER_CACHE_MAX_SIZE } from '../utils/cache';

/**
 * Wall-clock fields for an instant as observed in a specific IANA timezone, plus that
 * zone's UTC offset at that instant.
 */
export interface ZonedDateTime {
    year: number;
    /** 1-12 (not the 0-based `Date.getMonth()` convention). */
    month: number;
    day: number;
    /** 0-23. */
    hour: number;
    minute: number;
    second: number;
    /** local - UTC, in minutes (e.g. +540 for JST, -300 for EST). */
    offsetMinutes: number;
}

/**
 * The single Intl.DateTimeFormat cache for the whole extension's timezone resolution.
 *
 * Constructing an Intl.DateTimeFormat is by far the expensive part (formatToParts on an
 * existing instance measures ~2.4us, construction is an order of magnitude worse), so one
 * instance per zone is kept alive. Everything that needs zone-aware wall-clock fields -
 * the status bar clocks, tooltips, UTC offsets and alarm evaluation - goes through this
 * one cache rather than keeping a private cache each, which used to leave up to five
 * live Intl instances per timezone.
 */
const zonedFormatterCache: Map<string, Intl.DateTimeFormat> = new Map();

function getZonedFormatter(timeZoneId: string): Intl.DateTimeFormat {
    const cached = zonedFormatterCache.get(timeZoneId);
    if (cached) {
        return cached;
    }

    // hourCycle 'h23' (not just hour12: false) so midnight is "00" rather than "24".
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZoneId,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
    });

    evictOldestIfOverCapacity(zonedFormatterCache, FORMATTER_CACHE_MAX_SIZE);
    zonedFormatterCache.set(timeZoneId, formatter);
    return formatter;
}

/**
 * Resolves an instant into wall-clock fields for `timeZoneId`, along with the zone's UTC
 * offset at that instant.
 *
 * The offset is derived from the very same formatToParts() result rather than from a
 * second Intl call: reading the zone's wall clock and then re-interpreting those fields
 * as if they were UTC yields exactly (local - UTC). The parts array is scanned once into
 * plain numbers, without the intermediate `parts.map()` array and `Object.fromEntries()`
 * object the previous implementation allocated on every call.
 *
 * Throws (from Intl.DateTimeFormat's constructor) if `timeZoneId` is not a valid IANA ID.
 */
export function getZonedDateTime(timeMs: number, timeZoneId: string): ZonedDateTime {
    const parts = getZonedFormatter(timeZoneId).formatToParts(timeMs);

    let year = NaN;
    let month = NaN;
    let day = NaN;
    let hour = NaN;
    let minute = NaN;
    let second = NaN;

    for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        switch (part.type) {
            case 'year':
                year = Number(part.value);
                break;
            case 'month':
                month = Number(part.value);
                break;
            case 'day':
                day = Number(part.value);
                break;
            case 'hour':
                hour = Number(part.value);
                break;
            case 'minute':
                minute = Number(part.value);
                break;
            case 'second':
                second = Number(part.value);
                break;
            default:
                break;
        }
    }

    if (
        Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) ||
        Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)
    ) {
        // Formatting produced something unusable. Degrade to UTC rather than throwing, so a
        // surprising Intl result cannot take the status bar clock down with it.
        return zonedDateTimeInUtc(timeMs);
    }

    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        offsetMinutes: Math.round((asUtc - timeMs) / 60_000)
    };
}

function zonedDateTimeInUtc(timeMs: number): ZonedDateTime {
    const date = new Date(timeMs);
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        offsetMinutes: 0
    };
}

/** Same shape as `getZonedDateTime`, but for the host's own timezone (no Intl involved). */
export function getSystemDateTime(timeMs: number): ZonedDateTime {
    const date = new Date(timeMs);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        offsetMinutes: -date.getTimezoneOffset()
    };
}

/**
 * Wall-clock fields for `timeZoneId`, or for the host's own timezone when it is undefined.
 * The undefined case deliberately avoids Intl entirely - native Date getters are far
 * cheaper and are exactly what "system local" means.
 */
export function getWallClock(timeMs: number, timeZoneId: string | undefined): ZonedDateTime {
    return timeZoneId ? getZonedDateTime(timeMs, timeZoneId) : getSystemDateTime(timeMs);
}
