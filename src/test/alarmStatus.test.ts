import * as assert from 'assert';
import { AlarmTimeZoneResolver, buildAlarmStatusBarState } from '../alarm/AlarmStatus';
import { AlarmSettings } from '../alarm/AlarmSettings';
import { formatLocalAlarmTime } from '../alarm/localTime';
import { I18nManager } from '../i18n/I18nManager';
import { resolveAlarmTimeZone } from '../alarm/timeZoneResolution';

/** Builds a resolver equivalent to what AlarmManager wires up, for a fixed global setting. */
function resolverFor(globalTimeZone: string | undefined): AlarmTimeZoneResolver {
    return (alarm) => resolveAlarmTimeZone(globalTimeZone, alarm);
}

suite('AlarmStatus', () => {
    let i18n: I18nManager;
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

    setup(() => {
        i18n = I18nManager.getInstance();
        i18n.initialize('en');
    });

    suite('buildAlarmStatusBarState', () => {
        test('empty alarms show bell-add text and no-alarm tooltip', () => {
            const state = buildAlarmStatusBarState([], i18n);
            assert.strictEqual(state.text, '$(bell) $(add)');
            assert.ok(state.tooltip.includes('No alarm set'));
        });

        test('single enabled alarm shows bell icon with time', () => {
            const state = buildAlarmStatusBarState([makeAlarm({ hour: 14, minute: 30 })], i18n);
            assert.strictEqual(state.text, `$(bell) ${formatLocalAlarmTime(14, 30)}`);
        });

        test('single disabled alarm shows bell-slash icon with time', () => {
            const state = buildAlarmStatusBarState([makeAlarm({ enabled: false })], i18n);
            assert.strictEqual(state.text, `$(bell-slash) ${formatLocalAlarmTime(9, 0)}`);
        });

        test('single triggered alarm tooltip includes triggered-today message', () => {
            const state = buildAlarmStatusBarState([makeAlarm({ triggered: true, lastTriggeredOn: '2024-06-15' })], i18n);
            assert.ok(state.tooltip.includes('Triggered'), `Expected triggered info in tooltip: ${state.tooltip}`);
        });

        test('single enabled non-triggered alarm tooltip does not include triggered-today message', () => {
            const state = buildAlarmStatusBarState([makeAlarm()], i18n);
            assert.ok(!state.tooltip.includes('Triggered'), `Unexpected triggered info in tooltip: ${state.tooltip}`);
        });

        test('single alarm with lastTriggeredOn but triggered=false does not show Triggered', () => {
            const state = buildAlarmStatusBarState([makeAlarm({ lastTriggeredOn: '2024-06-14' })], i18n);
            assert.ok(!state.tooltip.includes('Triggered'), `Unexpected triggered info in tooltip: ${state.tooltip}`);
        });

        test('single disabled triggered alarm does not show Triggered', () => {
            const state = buildAlarmStatusBarState([makeAlarm({ enabled: false, triggered: true, lastTriggeredOn: '2024-06-15' })], i18n);
            assert.ok(!state.tooltip.includes('Triggered'), `Unexpected triggered info when disabled: ${state.tooltip}`);
        });

        test('multiple alarms do not show count suffix in status bar', () => {
            const alarms: AlarmSettings[] = [
                makeAlarm({ id: 'a1', hour: 9, minute: 0 }),
                makeAlarm({ id: 'a2', hour: 10, minute: 30 })
            ];
            const state = buildAlarmStatusBarState(alarms, i18n);
            assert.strictEqual(state.text, `$(bell) ${formatLocalAlarmTime(9, 0)}`);
        });

        test('multiple disabled alarms show bell-slash icon', () => {
            const alarms: AlarmSettings[] = [
                makeAlarm({ id: 'a1', enabled: false, hour: 9, minute: 0 }),
                makeAlarm({ id: 'a2', enabled: false, hour: 10, minute: 30 })
            ];
            const state = buildAlarmStatusBarState(alarms, i18n);
            assert.strictEqual(state.text, `$(bell-slash) ${formatLocalAlarmTime(9, 0)}`);
        });

        test('multiple alarm tooltip lists all alarms', () => {
            const alarms: AlarmSettings[] = [
                makeAlarm({ id: 'a1', hour: 9, minute: 0 }),
                makeAlarm({ id: 'a2', hour: 10, minute: 30, enabled: false })
            ];
            const state = buildAlarmStatusBarState(alarms, i18n);
            assert.ok(state.tooltip.includes(`1. ${formatLocalAlarmTime(9, 0)}`));
            assert.ok(state.tooltip.includes(`2. ${formatLocalAlarmTime(10, 30)}`));
        });
    });

    // Per-alarm timezone display (Issue #3 item 7): each alarm's timeZoneId (or the
    // global otak-clock.alarmTimeZone override) can now resolve to a different
    // timezone, so buildAlarmStatusBarState takes a per-alarm resolver instead of a
    // single shared timezone string.
    suite('buildAlarmStatusBarState with per-alarm timezone resolution', () => {
        test('global setting is "auto" (undefined): an alarm with timeZoneId is shown in its own timezone', () => {
            const alarm = makeAlarm({ hour: 9, minute: 0, timeZoneId: 'Asia/Tokyo' });
            const state = buildAlarmStatusBarState([alarm], i18n, resolverFor(undefined));
            const expected = formatLocalAlarmTime(9, 0, new Date(), 'Asia/Tokyo');
            assert.strictEqual(state.text, `$(bell) ${expected}`);
        });

        test('a global override wins over the alarm\'s own timeZoneId', () => {
            const alarm = makeAlarm({ hour: 9, minute: 0, timeZoneId: 'Asia/Tokyo' });
            const state = buildAlarmStatusBarState([alarm], i18n, resolverFor('UTC'));
            const expected = formatLocalAlarmTime(9, 0, new Date(), 'UTC');
            assert.strictEqual(state.text, `$(bell) ${expected}`);
        });

        test('no alarm timeZoneId and global "auto" render as system-local, same as the no-resolver default', () => {
            const alarm = makeAlarm({ hour: 9, minute: 0 });
            const withResolver = buildAlarmStatusBarState([alarm], i18n, resolverFor(undefined));
            const withoutResolver = buildAlarmStatusBarState([alarm], i18n);
            assert.strictEqual(withResolver.text, withoutResolver.text);
        });

        test('multiple alarms with different timeZoneId values are each shown in their own timezone', () => {
            const alarms: AlarmSettings[] = [
                makeAlarm({ id: 'a1', hour: 9, minute: 0, timeZoneId: 'Asia/Tokyo' }),
                makeAlarm({ id: 'a2', hour: 9, minute: 0, timeZoneId: 'America/Los_Angeles' })
            ];
            const state = buildAlarmStatusBarState(alarms, i18n, resolverFor(undefined));
            const tokyoTime = formatLocalAlarmTime(9, 0, new Date(), 'Asia/Tokyo');
            const losAngelesTime = formatLocalAlarmTime(9, 0, new Date(), 'America/Los_Angeles');
            assert.ok(state.tooltip.includes(`1. ${tokyoTime}`), `Expected Tokyo time in tooltip: ${state.tooltip}`);
            assert.ok(state.tooltip.includes(`2. ${losAngelesTime}`), `Expected Los Angeles time in tooltip: ${state.tooltip}`);
        });

        test('an invalid alarm.timeZoneId does not throw and renders as system-local', () => {
            const alarm = makeAlarm({ hour: 9, minute: 0, timeZoneId: 'Not/AZone' });
            assert.doesNotThrow(() => buildAlarmStatusBarState([alarm], i18n, resolverFor(undefined)));
            const state = buildAlarmStatusBarState([alarm], i18n, resolverFor(undefined));
            assert.strictEqual(state.text, `$(bell) ${formatLocalAlarmTime(9, 0)}`);
        });
    });
});
