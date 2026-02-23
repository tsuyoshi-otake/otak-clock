import * as assert from 'assert';
import { AlarmManager } from '../alarm/AlarmManager';

suite('AlarmManager', () => {
    suite('resolveAlarmTimeZone (auto behavior)', () => {
        function callResolve(globalTimeZone: string | undefined, alarmTimeZoneId?: string): string | undefined {
            const manager = Object.create(AlarmManager.prototype) as {
                getGlobalAlarmTimeZone: () => string | undefined;
                resolveAlarmTimeZone: (...args: unknown[]) => string | undefined;
            };
            manager.getGlobalAlarmTimeZone = () => globalTimeZone;
            return manager.resolveAlarmTimeZone({
                timeZoneId: alarmTimeZoneId
            });
        }

        test('returns undefined in auto mode even when alarm has saved timezone', () => {
            const resolved = callResolve(undefined, 'Asia/Tokyo');
            assert.strictEqual(resolved, undefined);
        });

        test('keeps auto mode device-local for UTC and JST synced alarms', () => {
            const utcSaved = callResolve(undefined, 'UTC');
            const jstSaved = callResolve(undefined, 'Asia/Tokyo');
            assert.strictEqual(utcSaved, undefined);
            assert.strictEqual(jstSaved, undefined);
        });

        test('uses global override when configured', () => {
            const resolved = callResolve('UTC', 'Asia/Tokyo');
            assert.strictEqual(resolved, 'UTC');
        });
    });
});
