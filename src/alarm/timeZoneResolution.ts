import { evictOldestIfOverCapacity, FORMATTER_CACHE_MAX_SIZE } from '../utils/cache';
import { AlarmSettings } from './AlarmSettings';

/**
 * Cache of IANA timezone ID -> validity, keyed by the raw ID string.
 * Intl.DateTimeFormat construction is not free, and resolveAlarmTimeZone() can be
 * called once per alarm per tick, so results are memoized (see the repo's
 * O(1)-lookup / per-tick-memoization convention in src/timezone/data.ts and
 * src/utils/cache.ts).
 */
const validTimeZoneCache: Map<string, boolean> = new Map();

/**
 * Validates an IANA timezone ID by attempting to construct an Intl.DateTimeFormat
 * with it, instead of checking it against the curated picker list in
 * src/timezone/data.ts (`findTimeZoneById`).
 *
 * This distinction matters: `AlarmConfig.timeZoneId` is captured via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`, which can legitimately return
 * IANA IDs that are valid but absent from the curated picker list (e.g. `Europe/Lisbon`,
 * `Asia/Kathmandu`, depending on region). Validating a per-alarm timeZoneId against that
 * whitelist would silently discard valid timezones. The global `otak-clock.alarmTimeZone`
 * setting is a different case (its values are constrained by a `package.json` enum),
 * so that one continues to use `findTimeZoneById`.
 */
export function isValidTimeZoneId(timeZoneId: string): boolean {
    const cached = validTimeZoneCache.get(timeZoneId);
    if (cached !== undefined) {
        return cached;
    }

    let isValid: boolean;
    try {
        // Constructed only to validate; Intl.DateTimeFormat throws RangeError for unknown IDs.
        new Intl.DateTimeFormat('en-US', { timeZone: timeZoneId });
        isValid = true;
    } catch {
        isValid = false;
    }

    evictOldestIfOverCapacity(validTimeZoneCache, FORMATTER_CACHE_MAX_SIZE);
    validTimeZoneCache.set(timeZoneId, isValid);
    return isValid;
}

/**
 * Resolves the effective timezone to use for evaluating/displaying a single alarm.
 *
 * Priority:
 *  1. `globalTimeZone` - the already-resolved `otak-clock.alarmTimeZone` setting
 *     (undefined when the setting is "auto"). When set, it applies uniformly to
 *     every alarm and wins outright.
 *  2. `alarm.timeZoneId` - the IANA ID captured when the alarm was created/edited
 *     (see `AlarmManager.detectSystemTimeZone()`). This is what makes "9:00 in Tokyo"
 *     keep firing at Tokyo's 9:00 after Settings Sync carries the alarm to a machine
 *     in a different timezone, instead of firing at that machine's local 9:00.
 *  3. `undefined` - callers (evaluateAlarmTick / toLocalDateKey / formatLocalAlarmTime)
 *     treat this as "system-local", falling back to the Date object's local getters.
 */
export function resolveAlarmTimeZone(globalTimeZone: string | undefined, alarm?: AlarmSettings): string | undefined {
    if (globalTimeZone) {
        return globalTimeZone;
    }

    const alarmTimeZoneId = alarm?.timeZoneId;
    if (alarmTimeZoneId && isValidTimeZoneId(alarmTimeZoneId)) {
        return alarmTimeZoneId;
    }

    return undefined;
}
