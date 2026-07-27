import * as assert from 'assert';
import { sameAlarms, pruneNotificationMap, updateAlarmById } from '../alarm/stateUtils';
import { AlarmSettings } from '../alarm/AlarmSettings';

suite('stateUtils', () => {
    function makeAlarm(overrides?: Partial<AlarmSettings>): AlarmSettings {
        return {
            id: 'alarm-1',
            enabled: true,
            hour: 9,
            minute: 0,
            triggered: false,
            ...overrides
        };
    }

    suite('sameAlarms', () => {
        test('returns true for identical arrays', () => {
            const a = [makeAlarm()];
            const b = [makeAlarm()];
            assert.strictEqual(sameAlarms(a, b), true);
        });

        test('returns false when only dismissedOn differs (cross-window Stop regression)', () => {
            const a = [makeAlarm({ dismissedOn: undefined })];
            const b = [makeAlarm({ dismissedOn: '2024-06-15' })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when only timeZoneId differs', () => {
            const a = [makeAlarm({ timeZoneId: 'Asia/Tokyo' })];
            const b = [makeAlarm({ timeZoneId: 'UTC' })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when id differs', () => {
            const a = [makeAlarm({ id: 'alarm-1' })];
            const b = [makeAlarm({ id: 'alarm-2' })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when enabled differs', () => {
            const a = [makeAlarm({ enabled: true })];
            const b = [makeAlarm({ enabled: false })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when hour differs', () => {
            const a = [makeAlarm({ hour: 9 })];
            const b = [makeAlarm({ hour: 10 })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when minute differs', () => {
            const a = [makeAlarm({ minute: 0 })];
            const b = [makeAlarm({ minute: 30 })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when triggered differs', () => {
            const a = [makeAlarm({ triggered: false })];
            const b = [makeAlarm({ triggered: true })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when lastTriggeredOn differs', () => {
            const a = [makeAlarm({ lastTriggeredOn: '2024-06-14' })];
            const b = [makeAlarm({ lastTriggeredOn: '2024-06-15' })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when snoozeUntilMs differs', () => {
            const a = [makeAlarm({ snoozeUntilMs: 1000 })];
            const b = [makeAlarm({ snoozeUntilMs: 2000 })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns false when lengths differ', () => {
            const a = [makeAlarm()];
            const b = [makeAlarm(), makeAlarm({ id: 'alarm-2' })];
            assert.strictEqual(sameAlarms(a, b), false);
        });

        test('returns true for two empty arrays', () => {
            assert.strictEqual(sameAlarms([], []), true);
        });
    });

    suite('pruneNotificationMap', () => {
        test('removes entries for alarm ids no longer present', () => {
            const map = new Map<string, number>([
                ['alarm-1', 100],
                ['alarm-2', 200]
            ]);
            pruneNotificationMap(map, [makeAlarm({ id: 'alarm-1' })]);
            assert.strictEqual(map.has('alarm-1'), true);
            assert.strictEqual(map.has('alarm-2'), false);
        });

        test('keeps entries whose alarm ids are still present', () => {
            const map = new Map<string, number>([
                ['alarm-1', 100],
                ['alarm-2', 200]
            ]);
            pruneNotificationMap(map, [
                makeAlarm({ id: 'alarm-1' }),
                makeAlarm({ id: 'alarm-2' })
            ]);
            assert.strictEqual(map.size, 2);
        });

        test('ignores alarms with no id when computing live ids', () => {
            const map = new Map<string, number>([['alarm-1', 100]]);
            pruneNotificationMap(map, [makeAlarm({ id: undefined })]);
            assert.strictEqual(map.has('alarm-1'), false);
        });
    });

    suite('updateAlarmById', () => {
        test('applies updater and reports found=true when id matches', () => {
            const alarms = [makeAlarm({ id: 'alarm-1', enabled: true })];
            const result = updateAlarmById(alarms, 'alarm-1', (alarm) => ({ ...alarm, enabled: false }));
            assert.strictEqual(result.found, true);
            assert.strictEqual(result.alarms[0].enabled, false);
        });

        test('leaves non-matching alarms untouched', () => {
            const alarms = [
                makeAlarm({ id: 'alarm-1', enabled: true }),
                makeAlarm({ id: 'alarm-2', enabled: true })
            ];
            const result = updateAlarmById(alarms, 'alarm-1', (alarm) => ({ ...alarm, enabled: false }));
            assert.strictEqual(result.alarms[1].enabled, true);
        });

        test('reports found=false and returns unchanged alarms when id does not match', () => {
            const alarms = [makeAlarm({ id: 'alarm-1' })];
            const result = updateAlarmById(alarms, 'missing-id', (alarm) => ({ ...alarm, enabled: false }));
            assert.strictEqual(result.found, false);
            assert.strictEqual(result.alarms[0].enabled, true);
        });
    });
});
