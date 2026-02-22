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
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'none');
        });

        test('triggers when time matches and not yet triggered', () => {
            const alarm = makeAlarm();
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'trigger');
        });

        test('returns none when time does not match', () => {
            const alarm = makeAlarm();
            const now = new Date(2024, 5, 15, 10, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'none');
        });

        test('returns none when already triggered today', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: '2024-06-15' });
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'none');
        });

        test('resets triggered flag on new day', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: '2024-06-14' });
            const now = new Date(2024, 5, 15, 8, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.triggered, false);
            }
        });

        test('prevents duplicate notification within cooldown', () => {
            const alarm = makeAlarm();
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const nowMs = now.getTime();
            const result = evaluateAlarmTick(alarm, now, nowMs - 30000);
            assert.strictEqual(result.action, 'none');
        });

        test('migration: resets triggered when before alarm time and no lastTriggeredOn', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: undefined });
            const now = new Date(2024, 5, 15, 8, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.triggered, false);
            }
        });

        test('migration: keeps triggered when after alarm time and no lastTriggeredOn', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: undefined });
            const now = new Date(2024, 5, 15, 10, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.lastTriggeredOn, '2024-06-15');
            }
        });

        test('triggers midnight alarm (hour=0, minute=0)', () => {
            const alarm = makeAlarm({ hour: 0, minute: 0 });
            const now = new Date(2024, 5, 15, 0, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'trigger');
        });

        test('does not trigger 23:59 alarm at 00:00 next day', () => {
            const alarm = makeAlarm({ hour: 23, minute: 59 });
            const now = new Date(2024, 5, 16, 0, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'none');
        });

        test('does not trigger while snoozed', () => {
            const now = new Date(2024, 5, 15, 9, 1, 0);
            const alarm = makeAlarm({ snoozeUntilMs: now.getTime() + 60_000 });
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'none');
        });

        test('triggers when snooze expires even if clock time does not match', () => {
            const now = new Date(2024, 5, 15, 9, 3, 0);
            const alarm = makeAlarm({
                hour: 9,
                minute: 0,
                triggered: false,
                snoozeUntilMs: now.getTime()
            });
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'trigger');
            if (result.action === 'trigger') {
                assert.strictEqual(result.alarm.snoozeUntilMs, undefined);
            }
        });

        test('clears stale snooze from another day', () => {
            const now = new Date(2024, 5, 16, 8, 0, 0);
            const snoozeYesterday = new Date(2024, 5, 15, 23, 59, 0).getTime();
            const alarm = makeAlarm({ snoozeUntilMs: snoozeYesterday });
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.snoozeUntilMs, undefined);
            }
        });

        test('returns none when dismissedOn matches today', () => {
            const alarm = makeAlarm({ dismissedOn: '2024-06-15' });
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'none');
        });

        test('triggers normally when dismissedOn is from a previous day', () => {
            const alarm = makeAlarm({ dismissedOn: '2024-06-14' });
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'trigger');
        });

        test('clears dismissedOn when day changes (triggered alarm)', () => {
            const alarm = makeAlarm({ triggered: true, lastTriggeredOn: '2024-06-14', dismissedOn: '2024-06-14' });
            const now = new Date(2024, 5, 15, 8, 0, 0);
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.triggered, false);
                assert.strictEqual(result.alarm.dismissedOn, undefined);
            }
        });

        test('clears dismissedOn with stale snooze from another day', () => {
            const now = new Date(2024, 5, 16, 8, 0, 0);
            const snoozeYesterday = new Date(2024, 5, 15, 23, 59, 0).getTime();
            const alarm = makeAlarm({ snoozeUntilMs: snoozeYesterday, dismissedOn: '2024-06-15' });
            const result = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.snoozeUntilMs, undefined);
                assert.strictEqual(result.alarm.dismissedOn, undefined);
            }
        });
    });

    suite('timezone-aware evaluation', () => {
        function makeAlarm(overrides?: Partial<AlarmSettings>): AlarmSettings {
            return {
                enabled: true,
                hour: 9,
                minute: 0,
                triggered: false,
                ...overrides
            };
        }

        test('triggers at alarm hour in specified timezone', () => {
            const alarm = makeAlarm({ hour: 9, minute: 0 });
            // 00:00 UTC = 09:00 Asia/Tokyo (UTC+9)
            const now = new Date('2024-06-15T00:00:00Z');
            const result = evaluateAlarmTick(alarm, now, 0, 'Asia/Tokyo');
            assert.strictEqual(result.action, 'trigger');
        });

        test('does not trigger when system time matches but alarm timezone time does not', () => {
            const alarm = makeAlarm({ hour: 9, minute: 0 });
            // 09:00 UTC = 18:00 Asia/Tokyo
            const now = new Date('2024-06-15T09:00:00Z');
            const result = evaluateAlarmTick(alarm, now, 0, 'Asia/Tokyo');
            assert.strictEqual(result.action, 'none');
        });

        test('toLocalDateKey uses specified timezone for date boundary', () => {
            // 23:30 UTC = 08:30+1day Asia/Tokyo
            const now = new Date('2024-06-15T23:30:00Z');
            assert.strictEqual(toLocalDateKey(now, 'Asia/Tokyo'), '2024-06-16');
            assert.strictEqual(toLocalDateKey(now, 'UTC'), '2024-06-15');
        });

        test('auto mode (undefined) matches legacy behavior', () => {
            const alarm = makeAlarm();
            const now = new Date(2024, 5, 15, 9, 0, 0);
            const autoResult = evaluateAlarmTick(alarm, now, 0, undefined);
            const legacyResult = evaluateAlarmTick(alarm, now, 0);
            assert.strictEqual(autoResult.action, legacyResult.action);
        });

        test('dismissedOn check uses alarm timezone date key', () => {
            // 23:30 UTC = 2024-06-16 in Asia/Tokyo
            const now = new Date('2024-06-15T23:30:00Z');
            const alarm = makeAlarm({ dismissedOn: '2024-06-16', hour: 8, minute: 30 });
            const result = evaluateAlarmTick(alarm, now, 0, 'Asia/Tokyo');
            assert.strictEqual(result.action, 'none');
        });

        test('snooze day boundary respects alarm timezone', () => {
            // now = 2024-06-16 00:00 JST (2024-06-15T15:00:00Z)
            const now = new Date('2024-06-15T15:00:00Z');
            // snooze set to 2024-06-14 23:59 JST (2024-06-14T14:59:00Z) — different day in JST
            const snoozeMs = new Date('2024-06-14T14:59:00Z').getTime();
            const alarm = makeAlarm({ snoozeUntilMs: snoozeMs });
            const result = evaluateAlarmTick(alarm, now, 0, 'Asia/Tokyo');
            assert.strictEqual(result.action, 'save');
            if (result.action === 'save') {
                assert.strictEqual(result.alarm.snoozeUntilMs, undefined);
            }
        });

        test('triggers with UTC timezone', () => {
            const alarm = makeAlarm({ hour: 15, minute: 30 });
            const now = new Date('2024-06-15T15:30:00Z');
            const result = evaluateAlarmTick(alarm, now, 0, 'UTC');
            assert.strictEqual(result.action, 'trigger');
        });
    });
});
