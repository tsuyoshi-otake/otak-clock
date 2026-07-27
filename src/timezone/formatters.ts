import { getZonedDateTime } from './zonedTime';
import { evictOldestIfOverCapacity, FORMATTER_CACHE_MAX_SIZE } from '../utils/cache';
import { pad2 } from '../utils/digits';
import { MS_PER_MINUTE } from '../utils/timing';

/**
 * Everything about a timezone that is constant for the duration of one wall-clock minute.
 *
 * The status bar redraws every second while the window is focused, but only the seconds
 * field actually changes within a minute - the hour, the minute, the date and the UTC
 * offset cannot. Resolving those once per minute and deriving seconds arithmetically is
 * what keeps Intl out of the per-second path entirely.
 *
 * This is exact rather than an approximation: IANA offset transitions always land on a
 * minute boundary, so a per-minute refresh can never observe a stale offset.
 */
export interface ZoneMinuteState {
    /** `Math.floor(timeMs / MS_PER_MINUTE)` this state was resolved for. */
    minuteBucket: number;
    /** local - UTC, in minutes. */
    offsetMinutes: number;
    /** "HH:mm" in the zone. */
    hourMinuteText: string;
    /** "MM/DD/YYYY" in the zone. */
    dateText: string;
}

const zoneMinuteStateCache: Map<string, ZoneMinuteState> = new Map();

/**
 * Returns the zone's per-minute state, recomputing (and so touching Intl) at most once per
 * minute per timezone. Within the same minute the *same object* is returned, so callers can
 * use reference equality to skip downstream work such as rebuilding tooltip text.
 */
export function getZoneMinuteState(timeMs: number, timeZoneId: string): ZoneMinuteState {
    const minuteBucket = Math.floor(timeMs / MS_PER_MINUTE);

    const cached = zoneMinuteStateCache.get(timeZoneId);
    if (cached && cached.minuteBucket === minuteBucket) {
        return cached;
    }

    const zoned = getZonedDateTime(timeMs, timeZoneId);
    const state: ZoneMinuteState = {
        minuteBucket,
        offsetMinutes: zoned.offsetMinutes,
        hourMinuteText: `${pad2(zoned.hour)}:${pad2(zoned.minute)}`,
        dateText: `${pad2(zoned.month)}/${pad2(zoned.day)}/${zoned.year}`
    };

    evictOldestIfOverCapacity(zoneMinuteStateCache, FORMATTER_CACHE_MAX_SIZE);
    zoneMinuteStateCache.set(timeZoneId, state);
    return state;
}

/**
 * Builds the status bar clock text for a zone.
 *
 * `state` supplies everything except the seconds, which are pure arithmetic on the instant:
 * UTC offsets are always a whole number of minutes for every zone in use today, so the
 * seconds field is the same in every timezone and needs no conversion at all.
 */
export function formatClockText(
    state: ZoneMinuteState,
    timeMs: number,
    isFocused: boolean,
    label: string | undefined
): string {
    const time = isFocused
        ? `${state.hourMinuteText}:${pad2(Math.floor(timeMs / 1000) % 60)}`
        : state.hourMinuteText;
    return label ? `${time} ${label}` : time;
}

/**
 * Cache of short zone labels keyed by `${timeZoneId}|${offsetMinutes}`.
 *
 * The label ("JST", "EST", "UTC+05:45", ...) only ever changes when the zone's offset
 * changes, i.e. at a DST transition - roughly twice a year. Keying on the offset means the
 * underlying Intl call happens about that often instead of once per minute, and lets the
 * `timeZoneName` formatter itself be thrown away after use rather than held in a cache.
 */
const shortLabelCache: Map<string, string> = new Map();

export function getTimeZoneShortLabel(timeZoneId: string, offsetMinutes: number, timeMs: number): string {
    // Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }) returns "GMT+9" for Asia/Tokyo,
    // but Japanese developers commonly expect "JST" for quick scanning in the status bar.
    if (timeZoneId === 'Asia/Tokyo') {
        return 'JST';
    }

    const key = `${timeZoneId}|${offsetMinutes}`;
    const cached = shortLabelCache.get(key);
    if (cached !== undefined) {
        return cached;
    }

    const label = resolveShortLabel(timeZoneId, timeMs);

    evictOldestIfOverCapacity(shortLabelCache, FORMATTER_CACHE_MAX_SIZE);
    shortLabelCache.set(key, label);
    return label;
}

function resolveShortLabel(timeZoneId: string, timeMs: number): string {
    // Built on demand and left to be collected: this runs about twice a year per zone, so
    // keeping the instance alive would cost memory for the whole session to save nothing.
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timeZoneId, timeZoneName: 'short' })
        .formatToParts(timeMs);

    let name: string | undefined;
    for (let i = 0; i < parts.length; i += 1) {
        if (parts[i].type === 'timeZoneName') {
            name = parts[i].value;
            break;
        }
    }

    if (!name) {
        return timeZoneId;
    }

    // Normalize "GMT+X" to "UTC+X" for consistency with other UI strings in this extension.
    return name.startsWith('GMT') ? `UTC${name.slice(3)}` : name;
}

/**
 * Resolves the short label for a zone without a caller-supplied offset. For UI-only paths
 * (alarm menus, the alarm status bar) that render on demand rather than on a tick.
 */
export function getTimeZoneShortLabelAt(timeZoneId: string, timeMs: number): string {
    if (timeZoneId === 'Asia/Tokyo') {
        return 'JST';
    }
    try {
        return getTimeZoneShortLabel(timeZoneId, getZonedDateTime(timeMs, timeZoneId).offsetMinutes, timeMs);
    } catch {
        // An unknown IANA ID must not take a status bar item or a quick-pick down with it.
        return timeZoneId;
    }
}
