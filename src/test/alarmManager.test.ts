import * as assert from 'assert';
import { AlarmManager } from '../alarm/AlarmManager';
import { AlarmSettings } from '../alarm/AlarmSettings';
import { isValidTimeZoneId, resolveAlarmTimeZone } from '../alarm/timeZoneResolution';

function makeAlarm(overrides?: Partial<AlarmSettings>): AlarmSettings {
    return {
        id: 'a1',
        enabled: true,
        hour: 9,
        minute: 0,
        triggered: false,
        ...overrides
    };
}

suite('AlarmManager', () => {
    // AlarmManager.resolveAlarmTimeZone() is private and just delegates to the pure
    // resolveAlarmTimeZone() (src/alarm/timeZoneResolution.ts) using its own
    // getGlobalAlarmTimeZone(). We stub getGlobalAlarmTimeZone() via the prototype so
    // this exercises the real delegation without touching any vscode API.
    suite('resolveAlarmTimeZone (AlarmManager instance method delegates to the pure resolver)', () => {
        function callResolve(globalTimeZone: string | undefined, alarm?: AlarmSettings): string | undefined {
            const manager = Object.create(AlarmManager.prototype) as {
                getGlobalAlarmTimeZone: () => string | undefined;
                resolveAlarmTimeZone: (alarm?: AlarmSettings) => string | undefined;
            };
            manager.getGlobalAlarmTimeZone = () => globalTimeZone;
            return manager.resolveAlarmTimeZone(alarm);
        }

        test('global "auto" (undefined) + alarm.timeZoneId uses the alarm\'s own saved timezone', () => {
            const resolved = callResolve(undefined, makeAlarm({ timeZoneId: 'Asia/Tokyo' }));
            assert.strictEqual(resolved, 'Asia/Tokyo');
        });

        test('a global override takes priority over the alarm\'s own timeZoneId', () => {
            const resolved = callResolve('UTC', makeAlarm({ timeZoneId: 'Asia/Tokyo' }));
            assert.strictEqual(resolved, 'UTC');
        });

        test('no alarm timeZoneId and global "auto" fall back to system-local (undefined)', () => {
            const resolved = callResolve(undefined, makeAlarm());
            assert.strictEqual(resolved, undefined);
        });

        test('no alarm object at all falls back to system-local (undefined)', () => {
            const resolved = callResolve(undefined, undefined);
            assert.strictEqual(resolved, undefined);
        });
    });

    // AlarmManager's remaining responsibilities (status bar items, the
    // onDidChangeConfiguration listener, quick-picks, globalState persistence) need a
    // running Extension Host and are not unit-testable here. The timezone-priority
    // decision itself is pure logic, extracted to timeZoneResolution.ts precisely so
    // it can be exercised directly, including edge cases beyond the suite above.
    suite('resolveAlarmTimeZone / isValidTimeZoneId (pure functions, src/alarm/timeZoneResolution.ts)', () => {
        test('a global timezone applies uniformly and wins regardless of the alarm', () => {
            assert.strictEqual(resolveAlarmTimeZone('UTC', makeAlarm({ timeZoneId: 'Asia/Tokyo' })), 'UTC');
            assert.strictEqual(resolveAlarmTimeZone('UTC', undefined), 'UTC');
        });

        test('falls back to the alarm\'s timezone when the global setting is "auto" (undefined)', () => {
            assert.strictEqual(resolveAlarmTimeZone(undefined, makeAlarm({ timeZoneId: 'Asia/Tokyo' })), 'Asia/Tokyo');
        });

        test('falls back to system-local (undefined) when neither the global setting nor the alarm has a timezone', () => {
            assert.strictEqual(resolveAlarmTimeZone(undefined, makeAlarm({ timeZoneId: undefined })), undefined);
            assert.strictEqual(resolveAlarmTimeZone(undefined, undefined), undefined);
        });

        test('a valid IANA id absent from the curated picker list (src/timezone/data.ts) is honored, not discarded', () => {
            // Europe/Lisbon is a real IANA zone but is not present in the curated list used
            // by the timezone picker UI (findTimeZoneById). AlarmManager.detectSystemTimeZone()
            // can legitimately return such IDs, so validating a per-alarm timeZoneId must not
            // depend on that curated whitelist, or valid alarm timezones would be silently lost.
            assert.strictEqual(isValidTimeZoneId('Europe/Lisbon'), true);
            assert.strictEqual(resolveAlarmTimeZone(undefined, makeAlarm({ timeZoneId: 'Europe/Lisbon' })), 'Europe/Lisbon');
        });

        test('an invalid timezone string does not throw and falls back to system-local', () => {
            assert.strictEqual(isValidTimeZoneId('Not/AZone'), false);
            assert.doesNotThrow(() => resolveAlarmTimeZone(undefined, makeAlarm({ timeZoneId: 'Not/AZone' })));
            assert.strictEqual(resolveAlarmTimeZone(undefined, makeAlarm({ timeZoneId: 'Not/AZone' })), undefined);
        });

        test('repeated validation calls for the same id are consistent (exercises the memoization cache)', () => {
            assert.strictEqual(isValidTimeZoneId('Asia/Kathmandu'), true);
            assert.strictEqual(isValidTimeZoneId('Asia/Kathmandu'), true);
        });
    });
});
