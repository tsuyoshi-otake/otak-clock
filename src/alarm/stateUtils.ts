import { AlarmSettings } from './AlarmSettings';

export function sameAlarms(a: AlarmSettings[], b: AlarmSettings[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i += 1) {
        if (a[i].id !== b[i].id
            || a[i].enabled !== b[i].enabled
            || a[i].hour !== b[i].hour
            || a[i].minute !== b[i].minute
            || a[i].triggered !== b[i].triggered
            || a[i].lastTriggeredOn !== b[i].lastTriggeredOn
            || a[i].snoozeUntilMs !== b[i].snoozeUntilMs) {
            return false;
        }
    }

    return true;
}

export function pruneNotificationMap(
    map: Map<string, number>,
    alarms: AlarmSettings[]
): void {
    const liveIds = new Set(
        alarms
            .map((alarm) => alarm.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    for (const id of map.keys()) {
        if (!liveIds.has(id)) {
            map.delete(id);
        }
    }
}

export function updateAlarmById(
    alarms: AlarmSettings[],
    alarmId: string,
    updater: (alarm: AlarmSettings) => AlarmSettings
): { found: boolean; alarms: AlarmSettings[] } {
    let found = false;
    const updated = alarms.map((alarm) => {
        if (alarm.id !== alarmId) {
            return alarm;
        }
        found = true;
        return updater(alarm);
    });

    return { found, alarms: updated };
}
