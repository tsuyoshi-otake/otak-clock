import { AlarmSettings } from './AlarmSettings';
import { NOTIFICATION_COOLDOWN_MS, ALARM_CATCH_UP_WINDOW_MINUTES, ALARM_DST_GAP_SEARCH_MINUTES } from './constants';
import { getWallClock, getZonedDateTime } from '../timezone/zonedTime';
import { pad2 } from '../utils/digits';

// Wall-clock resolution goes through the extension-wide formatter cache in
// src/timezone/zonedTime.ts. Alarm evaluation used to keep a third private cache of
// Intl.DateTimeFormat instances alongside the clock's and the offset helper's, which meant
// the same timezone was represented several times over in memory for no benefit -
// constructing the formatter is the expensive part, and one instance per zone is enough.

export function toLocalDateKey(now: Date, alarmTimeZone?: string): string {
    const wc = getWallClock(now.getTime(), alarmTimeZone);
    return `${wc.year}-${pad2(wc.month)}-${pad2(wc.day)}`;
}

export type AlarmTickResult =
    | { action: 'none' }
    | { action: 'save'; alarm: AlarmSettings }
    | { action: 'trigger'; alarm: AlarmSettings; todayKey: string };

function minuteOfDay(hour: number, minute: number): number {
    return hour * 60 + minute;
}

/**
 * Checks whether the given wall-clock time exists today for the system-local timezone,
 * using the Date constructor's own DST normalization as the round-trip check: if the
 * requested hour/minute falls inside a "spring forward" gap, the engine silently rolls
 * the components forward, so the read-back components will no longer match the input.
 */
function wallTimeExistsLocally(year: number, month: number, day: number, hour: number, minute: number): boolean {
    const probe = new Date(year, month - 1, day, hour, minute, 0, 0);
    return (
        probe.getFullYear() === year &&
        probe.getMonth() === month - 1 &&
        probe.getDate() === day &&
        probe.getHours() === hour &&
        probe.getMinutes() === minute
    );
}

/**
 * Estimates the UTC instant corresponding to a wall-clock time in an IANA timezone,
 * without a timezone-conversion library. The wall-clock components are first treated
 * as if they were UTC to get a baseline instant, the zone's offset is looked up there,
 * and a first estimate is refined by looking up the offset again at that estimate
 * (rather than at the baseline) — this second lookup is what makes the estimate land
 * on the correct side of a DST transition. This estimate is only meant to be fed back
 * into `wallTimeExists()`'s round-trip check; it is not guaranteed correct in general
 * (e.g. for the ambiguous "fall back" hour, where either offset is valid).
 */
function estimateUtcInstantForWallTime(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    timeZoneId: string
): number {
    const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    const firstOffsetMinutes = getZonedDateTime(localAsUtc, timeZoneId).offsetMinutes;
    const firstEstimate = localAsUtc - firstOffsetMinutes * 60_000;
    const secondOffsetMinutes = getZonedDateTime(firstEstimate, timeZoneId).offsetMinutes;
    return localAsUtc - secondOffsetMinutes * 60_000;
}

/**
 * Cheap offset lookup used purely as a pre-check to decide whether it's worth doing the
 * expensive round-trip DST check at all. For the system-local case this is a native
 * getter (no Intl involved); for a named timezone it goes through the shared formatter
 * cache. Sign convention matches getUtcOffsetMinutes (local - UTC, in minutes).
 */
function offsetMinutesAt(timeMs: number, alarmTimeZone: string | undefined): number {
    return getWallClock(timeMs, alarmTimeZone).offsetMinutes;
}

/**
 * Determines whether the given wall-clock date/time actually occurs in the specified
 * timezone (or system-local time when `alarmTimeZone` is undefined). Returns false for
 * times that fall inside a DST "spring forward" gap (e.g. 2:30 AM on the day
 * America/New_York jumps from 2:00 AM to 3:00 AM).
 */
function wallTimeExists(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    alarmTimeZone: string | undefined
): boolean {
    if (!alarmTimeZone) {
        return wallTimeExistsLocally(year, month, day, hour, minute);
    }

    const estimated = estimateUtcInstantForWallTime(year, month, day, hour, minute, alarmTimeZone);
    const roundTrip = getWallClock(estimated, alarmTimeZone);
    return (
        roundTrip.year === year &&
        roundTrip.month === month &&
        roundTrip.day === day &&
        roundTrip.hour === hour &&
        roundTrip.minute === minute
    );
}

/**
 * Resolves the effective minute-of-day at which the alarm should be considered due.
 * Normally this is just the alarm's own hour/minute. But when that wall-clock time
 * does not exist today (DST gap), the nominal minute can never actually be observed,
 * so we resolve to the first minute after the gap that does exist — i.e. the moment
 * the wall clock resumes — which is when the alarm should fire instead. This mirrors
 * how mobile OS alarms behave when their scheduled time is skipped by a DST jump.
 */
function resolveEffectiveAlarmMinuteOfDay(
    year: number,
    month: number,
    day: number,
    alarmHour: number,
    alarmMinute: number,
    alarmTimeZone: string | undefined
): number {
    const nominal = minuteOfDay(alarmHour, alarmMinute);

    for (let offset = 1; offset <= ALARM_DST_GAP_SEARCH_MINUTES; offset++) {
        const candidateMinuteOfDay = nominal + offset;
        if (candidateMinuteOfDay >= 24 * 60) {
            break;
        }
        const candidateHour = Math.floor(candidateMinuteOfDay / 60);
        const candidateMinute = candidateMinuteOfDay % 60;
        if (wallTimeExists(year, month, day, candidateHour, candidateMinute, alarmTimeZone)) {
            return candidateMinuteOfDay;
        }
    }

    // Should not happen under real-world DST rules (gaps are at most a couple of hours).
    // Fall back to the nominal minute so we degrade to "never quite catches up today"
    // rather than throwing.
    return nominal;
}

function attemptTrigger(
    alarm: AlarmSettings,
    todayKey: string,
    nowMs: number,
    lastNotificationTimeMs: number
): AlarmTickResult {
    // 同じ分内での重複通知を防ぐ
    if (nowMs - lastNotificationTimeMs < NOTIFICATION_COOLDOWN_MS) {
        return { action: 'none' };
    }
    return { action: 'trigger', alarm, todayKey };
}

function withoutSnooze(alarm: AlarmSettings): AlarmSettings {
    if (alarm.snoozeUntilMs === undefined) {
        return alarm;
    }
    const next = { ...alarm };
    delete next.snoozeUntilMs;
    return next;
}

function withoutDismissed(alarm: AlarmSettings): AlarmSettings {
    if (alarm.dismissedOn === undefined) {
        return alarm;
    }
    const next = { ...alarm };
    delete next.dismissedOn;
    return next;
}

function evaluateTriggeredAlarm(alarm: AlarmSettings, todayKey: string, nowHour: number, nowMinute: number): AlarmTickResult {
    if (!alarm.lastTriggeredOn) {
        // Migration: older versions didn't track the trigger date.
        // Infer whether we should allow the alarm to trigger again today.
        const alarmMinuteOfDay = minuteOfDay(alarm.hour, alarm.minute);
        const nowMinuteOfDay = minuteOfDay(nowHour, nowMinute);

        if (nowMinuteOfDay <= alarmMinuteOfDay) {
            // It's not past today's alarm time yet, so treat this as a carry-over
            // from a previous day and allow the alarm to trigger again today.
            return { action: 'save', alarm: withoutDismissed(withoutSnooze({ ...alarm, triggered: false })) };
        }

        // Today's alarm time already passed. Treat this as already triggered today
        // to avoid firing unexpectedly after an upgrade.
        return { action: 'save', alarm: withoutSnooze({ ...alarm, lastTriggeredOn: todayKey }) };
    }

    if (alarm.lastTriggeredOn !== todayKey) {
        return { action: 'save', alarm: withoutDismissed(withoutSnooze({ ...alarm, triggered: false })) };
    }

    return { action: 'none' };
}

export function evaluateAlarmTick(
    alarm: AlarmSettings,
    now: Date,
    lastNotificationTimeMs: number,
    alarmTimeZone?: string
): AlarmTickResult {
    if (!alarm.enabled) {
        return { action: 'none' };
    }

    const nowMs = now.getTime();
    const wc = getWallClock(nowMs, alarmTimeZone);
    const todayKey = `${wc.year}-${pad2(wc.month)}-${pad2(wc.day)}`;

    // If the user manually dismissed this alarm today (e.g., Stop pressed in another window),
    // treat it as already handled for today.
    if (alarm.dismissedOn === todayKey) {
        return { action: 'none' };
    }

    const nowHour = wc.hour;
    const nowMinute = wc.minute;
    const snoozeUntilMs = alarm.snoozeUntilMs;

    if (alarm.triggered) {
        // Reset "triggered" when the local day changes. This works even if VS Code
        // was closed at midnight.
        return evaluateTriggeredAlarm(alarm, todayKey, nowHour, nowMinute);
    }

    if (typeof snoozeUntilMs === 'number') {
        // 日付キーの一致ではなく、まず「まだ未来か」で判定する。日付ガードを先に見てしまうと、
        // 23:59にスヌーズして翌0:02に期限が来るような正常なスヌーズが、期限前（まだ当日=前日）の
        // ティックで「日付が違う」と誤判定されて即座に破棄されてしまう（このガードは本来、
        // 前日以前に切れて放置された古いスヌーズを翌日に持ち越さないためのものだった）。
        if (nowMs < snoozeUntilMs) {
            return { action: 'none' };
        }

        // ここに来るのはスヌーズ期限が既に過ぎているケースのみ。日付キーが今日と異なるのは
        // 「明らかに古い」（前日以前に切れて放置された）場合に限られるので、その時だけ破棄する。
        const snoozeDayKey = toLocalDateKey(new Date(snoozeUntilMs), alarmTimeZone);
        if (snoozeDayKey !== todayKey) {
            return { action: 'save', alarm: withoutDismissed(withoutSnooze(alarm)) };
        }

        const alarmWithoutSnooze = withoutSnooze(alarm);
        if (nowMs - lastNotificationTimeMs < NOTIFICATION_COOLDOWN_MS) {
            return { action: 'save', alarm: alarmWithoutSnooze };
        }
        return { action: 'trigger', alarm: alarmWithoutSnooze, todayKey };
    }

    const alarmMinuteOfDay = minuteOfDay(alarm.hour, alarm.minute);
    const nowMinuteOfDay = minuteOfDay(nowHour, nowMinute);
    const rawDelta = nowMinuteOfDay - alarmMinuteOfDay;

    // 通常ケース: 厳密一致、またはスリープ復帰・タイマー遅延による取りこぼしを猶予幅内で救済。
    // 上限を必ず設ける（無制限だと朝のアラームが夕方の起動で鳴ってしまう）。
    if (rawDelta >= 0 && rawDelta <= ALARM_CATCH_UP_WINDOW_MINUTES) {
        return attemptTrigger(alarm, todayKey, nowMs, lastNotificationTimeMs);
    }

    // DSTの春時間移行でアラーム時刻の壁時計表現がその日存在しない場合、通常の猶予幅（数分）では
    // 取りこぼしを救済できない（ギャップは通常60分）。猶予幅を単純に広げるのではなく、
    // 「その時刻が実在するか」を明示的に判定し、実在しない場合のみギャップ明けの最初の
    // 実在時刻を実質的なアラーム時刻とみなして同じ猶予幅を適用する。
    //
    // DSTギャップは年1〜2回・数十分しか起きないのに対し、このブロックはアラーム時刻から
    // ALARM_DST_GAP_SEARCH_MINUTES 分の間、毎ティック評価される。round-trip 判定
    // （wallTimeExists / resolveEffectiveAlarmMinuteOfDay）を毎回走らせるのは無駄なので、
    // まず「now と、猶予幅超過が始まった時点（おおよそ rawDelta 分前）とでオフセットが
    // 変わっていないか」を安価にチェックする。同じなら区間内に移行は起きていないので
    // wallTimeExists は必ず true であり、以降の判定を省略できる（＝通常の365日はここで抜ける）。
    if (rawDelta > ALARM_CATCH_UP_WINDOW_MINUTES && rawDelta <= ALARM_DST_GAP_SEARCH_MINUTES) {
        const offsetNow = offsetMinutesAt(nowMs, alarmTimeZone);
        const offsetAroundAlarmTime = offsetMinutesAt(nowMs - rawDelta * 60_000, alarmTimeZone);
        const possibleTransitionInRange = offsetNow !== offsetAroundAlarmTime;

        if (possibleTransitionInRange && !wallTimeExists(wc.year, wc.month, wc.day, alarm.hour, alarm.minute, alarmTimeZone)) {
            const effectiveMinuteOfDay = resolveEffectiveAlarmMinuteOfDay(
                wc.year,
                wc.month,
                wc.day,
                alarm.hour,
                alarm.minute,
                alarmTimeZone
            );
            const gapDelta = nowMinuteOfDay - effectiveMinuteOfDay;
            if (gapDelta >= 0 && gapDelta <= ALARM_CATCH_UP_WINDOW_MINUTES) {
                return attemptTrigger(alarm, todayKey, nowMs, lastNotificationTimeMs);
            }
        }
    }

    return { action: 'none' };
}
