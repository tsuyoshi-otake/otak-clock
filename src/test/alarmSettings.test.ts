import * as assert from 'assert';
import { ALARM_TIME_REGEX, createDefaultAlarm, formatTime, validateAlarmSettings } from '../alarm/AlarmSettings';

suite('AlarmSettings', () => {
    suite('createDefaultAlarm', () => {
        test('creates alarm with default values', () => {
            const alarm = createDefaultAlarm();
            assert.strictEqual(alarm.enabled, true);
            assert.strictEqual(alarm.hour, 9);
            assert.strictEqual(alarm.minute, 0);
            assert.strictEqual(alarm.triggered, false);
        });
    });

    suite('formatTime', () => {
        test('formats single-digit hour and minute with padding', () => {
            assert.strictEqual(formatTime(9, 5), '09:05');
        });

        test('formats double-digit hour and minute', () => {
            assert.strictEqual(formatTime(14, 30), '14:30');
        });

        test('formats midnight', () => {
            assert.strictEqual(formatTime(0, 0), '00:00');
        });

        test('formats 23:59', () => {
            assert.strictEqual(formatTime(23, 59), '23:59');
        });
    });

    suite('validateAlarmSettings', () => {
        test('returns undefined for null', () => {
            assert.strictEqual(validateAlarmSettings(null), undefined);
        });

        test('returns undefined for non-object', () => {
            assert.strictEqual(validateAlarmSettings('string'), undefined);
            assert.strictEqual(validateAlarmSettings(123), undefined);
            assert.strictEqual(validateAlarmSettings(undefined), undefined);
        });

        test('returns undefined for out-of-range hour', () => {
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: -1, minute: 0, triggered: false }), undefined);
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: 24, minute: 0, triggered: false }), undefined);
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: 9.5, minute: 0, triggered: false }), undefined);
        });

        test('returns undefined for out-of-range minute', () => {
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: 9, minute: -1, triggered: false }), undefined);
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: 9, minute: 60, triggered: false }), undefined);
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: 9, minute: 30.5, triggered: false }), undefined);
        });

        test('returns valid settings for correct data', () => {
            const result = validateAlarmSettings({ enabled: true, hour: 9, minute: 30, triggered: true, lastTriggeredOn: '2026-02-17' });
            assert.deepStrictEqual(result, { enabled: true, hour: 9, minute: 30, triggered: true, lastTriggeredOn: '2026-02-17' });
        });

        test('defaults triggered to false if missing', () => {
            const result = validateAlarmSettings({ enabled: true, hour: 9, minute: 0 });
            assert.ok(result);
            assert.strictEqual(result.triggered, false);
        });

        test('defaults lastTriggeredOn to undefined if missing', () => {
            const result = validateAlarmSettings({ enabled: false, hour: 12, minute: 0, triggered: false });
            assert.ok(result);
            assert.strictEqual(result.lastTriggeredOn, undefined);
        });
    });

    suite('ALARM_TIME_REGEX', () => {
        test('accepts 09:00', () => {
            assert.ok(ALARM_TIME_REGEX.test('09:00'));
        });

        test('accepts 23:59', () => {
            assert.ok(ALARM_TIME_REGEX.test('23:59'));
        });

        test('rejects 24:00', () => {
            assert.strictEqual(ALARM_TIME_REGEX.test('24:00'), false);
        });

        test('rejects single-digit minute like 9:5', () => {
            assert.strictEqual(ALARM_TIME_REGEX.test('9:5'), false);
        });

        test('accepts 00:00 midnight', () => {
            assert.ok(ALARM_TIME_REGEX.test('00:00'));
        });

        test('accepts 0:00 single-digit hour', () => {
            assert.ok(ALARM_TIME_REGEX.test('0:00'));
        });
    });

    suite('validateAlarmSettings edge cases', () => {
        test('returns undefined when enabled field is missing', () => {
            assert.strictEqual(validateAlarmSettings({ hour: 9, minute: 0, triggered: false }), undefined);
        });

        test('returns undefined when hour field is missing', () => {
            assert.strictEqual(validateAlarmSettings({ enabled: true, minute: 0, triggered: false }), undefined);
        });

        test('returns undefined when minute field is missing', () => {
            assert.strictEqual(validateAlarmSettings({ enabled: true, hour: 9, triggered: false }), undefined);
        });
    });
});
