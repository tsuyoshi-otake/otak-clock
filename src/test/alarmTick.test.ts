import * as assert from 'assert';
import { toLocalDateKey, evaluateAlarmTick } from '../alarm/alarmTick';
import { AlarmSettings } from '../alarm/AlarmSettings';

suite('alarmTick', () => {
    suite('toLocalDateKey', () => {
        test('formats date as YYYY-MM-DD', () => {
            const date = new Date(2024, 5, 15); // June 15, 2024
            assert.strictEqual(toLocalDateKey(date), '2024-06-15');
        });

        test('pads single-digit month and day', () => {
            const date = new Date(2024, 0, 5); // Jan 5, 2024
            assert.strictEqual(toLocalDateKey(date), '2024-01-05');
        });
    });

    suite('evaluateAlarmTick', () => {
        function makeAlarm(overrides?: Partial<AlarmSettings>): AlarmSettings {
            return {
                enabled: true,
                hour: 9,
                minute: 0,
                triggered: false,
                ...overrides
            };
        }

        test('returns none when alarm is disabled', () => {
            const alarm = makeAlarm({ enabled: false });
            const result = evaluateAlarmTick(alarm, 9, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'none');
        });

        test('triggers when time matches and not yet triggered', () => {
            const alarm = makeAlarm();
            const result = evaluateAlarmTick(alarm, 9, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'trigger');
        });

        test('returns none when time does not match', () => {
            const alarm = makeAlarm();
            const result = evaluateAlarmTick(alarm, 10, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'none');
        });

        test('returns none when already triggered today', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: '2024-06-15' });
            const result = evaluateAlarmTick(alarm, 9, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'none');
        });

        test('resets triggered flag on new day', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: '2024-06-14' });
            const result = evaluateAlarmTick(alarm, 8, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.triggered, false);
            }
        });

        test('prevents duplicate notification within cooldown', () => {
            const alarm = makeAlarm();
            const now = Date.now();
            const result = evaluateAlarmTick(alarm, 9, 0, '2024-06-15', now - 30000, now);
            assert.strictEqual(result.action, 'none');
        });

        test('migration: resets triggered when before alarm time and no lastTriggeredOn', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: undefined });
            const result = evaluateAlarmTick(alarm, 8, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.triggered, false);
            }
        });

        test('migration: keeps triggered when after alarm time and no lastTriggeredOn', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: undefined });
            const result = evaluateAlarmTick(alarm, 10, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.lastTriggeredOn, '2024-06-15');
            }
        });

        test('triggers midnight alarm (hour=0, minute=0)', () => {
            const alarm = makeAlarm({ hour: 0, minute: 0 });
            const result = evaluateAlarmTick(alarm, 0, 0, '2024-06-15', 0, Date.now());
            assert.strictEqual(result.action, 'trigger');
        });

        test('does not trigger 23:59 alarm at 00:00 next day', () => {
            const alarm = makeAlarm({ hour: 23, minute: 59 });
            const result = evaluateAlarmTick(alarm, 0, 0, '2024-06-16', 0, Date.now());
            assert.strictEqual(result.action, 'none');
        });
    });
});
