import { AlarmSettings } from './AlarmSettings';

/**
 * Fields compared by `sameAlarms()`. Listed explicitly (rather than relying on a
 * caller to remember every `AlarmConfig`/`AlarmRuntime` field) so adding a new
 * field to `AlarmSettings` only requires adding it here, not re-deriving a
 * hand-written `||` chain.
 *
 * `timeSignature` is intentionally excluded: it is a derived runtime value
 * (formatTime(hour, minute), see AlarmSettings.ts) recomputed from `hour`/`minute`
 * rather than independently meaningful state. Comparing hour/minute already
 * detects the change it would represent; including it too would risk spurious
 * mismatches if the two sides regenerate it at slightly different times (e.g.
 * during migration) without any actual difference in alarm behavior.
 */
const COMPARABLE_FIELDS: readonly (keyof AlarmSettings)[] = [
    'id',
    'enabled',
    'hour',
    'minute',
    'timeZoneId',
    'triggered',
    'lastTriggeredOn',
    'snoozeUntilMs',
    'dismissedOn'
];

export function sameAlarms(a: AlarmSettings[], b: AlarmSettings[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i += 1) {
        for (const field of COMPARABLE_FIELDS) {
            if (a[i][field] !== b[i][field]) {
                return false;
            }
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
