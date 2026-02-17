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

export function evaluateAlarmTick(
    alarm: AlarmSettings,
    currentHour: number,
    currentMinute: number,
    todayKey: string,
    lastNotificationTime: number,
    currentTime: number
): AlarmTickResult {
    if (!alarm.enabled) {
        return { action: 'none' };
    }

    // Reset "triggered" when the local day changes. This works even if VS Code
    // was closed at midnight.
    if (alarm.triggered) {
        if (!alarm.lastTriggeredOn) {
            // Migration: older versions didn't track the date. Infer whether we should
            // allow the alarm to trigger today.
            const alarmMinuteOfDay = alarm.hour * 60 + alarm.minute;
            const currentMinuteOfDay = currentHour * 60 + currentMinute;

            if (currentMinuteOfDay <= alarmMinuteOfDay) {
                // It's not past today's alarm time yet, so treat this as a carry-over
                // from a previous day and allow the alarm to trigger again today.
                const updated = { ...alarm, triggered: false };
                return { action: 'save', alarm: updated };
            } else {
                // Today's alarm time already passed. Treat this as already triggered today
                // to avoid firing unexpectedly after an upgrade.
                const updated = { ...alarm, lastTriggeredOn: todayKey };
                return { action: 'save', alarm: updated };
            }
        }

        if (alarm.lastTriggeredOn !== todayKey) {
            const updated = { ...alarm, triggered: false };
            return { action: 'save', alarm: updated };
        }

        return { action: 'none' };
    }

    if (alarm.hour === currentHour && alarm.minute === currentMinute) {
        // 同じ分内での重複通知を防ぐ
        if (currentTime - lastNotificationTime < NOTIFICATION_COOLDOWN_MS) {
            return { action: 'none' };
        }
        return { action: 'trigger', alarm, todayKey };
    }

    return { action: 'none' };
}
