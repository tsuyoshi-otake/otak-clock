import { AlarmSettings } from './AlarmSettings';
import { NOTIFICATION_COOLDOWN_MS } from '../clock/constants';

export function toLocalDateKey(now: Date): string {
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export type AlarmTickResult =
    | { action: 'none' }
    | { action: 'save'; alarm: AlarmSettings }
    | { action: 'trigger'; alarm: AlarmSettings; todayKey: string };

function minuteOfDay(hour: number, minute: number): number {
    return hour * 60 + minute;
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
            return { action: 'save', alarm: { ...alarm, triggered: false } };
        }

        // Today's alarm time already passed. Treat this as already triggered today
        // to avoid firing unexpectedly after an upgrade.
        return { action: 'save', alarm: { ...alarm, lastTriggeredOn: todayKey } };
    }

    if (alarm.lastTriggeredOn !== todayKey) {
        return { action: 'save', alarm: { ...alarm, triggered: false } };
    }

    return { action: 'none' };
}

export function evaluateAlarmTick(
    alarm: AlarmSettings,
    now: Date,
    lastNotificationTimeMs: number
): AlarmTickResult {
    if (!alarm.enabled) {
        return { action: 'none' };
    }

    const todayKey = toLocalDateKey(now);
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const nowMs = now.getTime();

    if (alarm.triggered) {
        // Reset "triggered" when the local day changes. This works even if VS Code
        // was closed at midnight.
        return evaluateTriggeredAlarm(alarm, todayKey, nowHour, nowMinute);
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
