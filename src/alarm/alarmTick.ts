import { AlarmSettings } from './AlarmSettings';
import { NOTIFICATION_COOLDOWN_MS } from '../clock/constants';

interface WallClockTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

/**
 * Extracts wall-clock components for the given instant in the specified timezone.
 * When alarmTimeZone is undefined (auto mode), falls back to system-local Date methods.
 */
function getWallClock(now: Date, alarmTimeZone: string | undefined): WallClockTime {
    if (!alarmTimeZone) {
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: now.getHours(),
            minute: now.getMinutes()
        };
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: alarmTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23'
    });
    const parts: Record<string, string> = {};
    for (const p of formatter.formatToParts(now)) {
        parts[p.type] = p.value;
    }

    return {
        year: Number(parts['year']),
        month: Number(parts['month']),
        day: Number(parts['day']),
        hour: Number(parts['hour']),
        minute: Number(parts['minute'])
    };
}

export function toLocalDateKey(now: Date, alarmTimeZone?: string): string {
    const wc = getWallClock(now, alarmTimeZone);
    const yyyy = wc.year;
    const mm = wc.month.toString().padStart(2, '0');
    const dd = wc.day.toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export type AlarmTickResult =
    | { action: 'none' }
    | { action: 'save'; alarm: AlarmSettings }
    | { action: 'trigger'; alarm: AlarmSettings; todayKey: string };

function minuteOfDay(hour: number, minute: number): number {
    return hour * 60 + minute;
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

    const wc = getWallClock(now, alarmTimeZone);
    const todayKey = `${wc.year}-${wc.month.toString().padStart(2, '0')}-${wc.day.toString().padStart(2, '0')}`;

    // If the user manually dismissed this alarm today (e.g., Stop pressed in another window),
    // treat it as already handled for today.
    if (alarm.dismissedOn === todayKey) {
        return { action: 'none' };
    }

    const nowHour = wc.hour;
    const nowMinute = wc.minute;
    const nowMs = now.getTime();
    const snoozeUntilMs = alarm.snoozeUntilMs;

    if (alarm.triggered) {
        // Reset "triggered" when the local day changes. This works even if VS Code
        // was closed at midnight.
        return evaluateTriggeredAlarm(alarm, todayKey, nowHour, nowMinute);
    }

    if (typeof snoozeUntilMs === 'number') {
        const snoozeDayKey = toLocalDateKey(new Date(snoozeUntilMs), alarmTimeZone);
        if (snoozeDayKey !== todayKey) {
            return { action: 'save', alarm: withoutDismissed(withoutSnooze(alarm)) };
        }

        if (nowMs < snoozeUntilMs) {
            return { action: 'none' };
        }

        const alarmWithoutSnooze = withoutSnooze(alarm);
        if (nowMs - lastNotificationTimeMs < NOTIFICATION_COOLDOWN_MS) {
            return { action: 'save', alarm: alarmWithoutSnooze };
        }
        return { action: 'trigger', alarm: alarmWithoutSnooze, todayKey };
    }

    if (alarm.hour === nowHour && alarm.minute === nowMinute) {
        // 同じ分内での重複通知を防ぐ
        if (nowMs - lastNotificationTimeMs < NOTIFICATION_COOLDOWN_MS) {
            return { action: 'none' };
        }
        return { action: 'trigger', alarm, todayKey };
    }

    return { action: 'none' };
}
