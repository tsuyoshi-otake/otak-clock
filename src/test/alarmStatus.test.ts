import * as assert from 'assert';
import { buildAlarmStatusBarState } from '../alarm/AlarmStatus';
import { AlarmSettings } from '../alarm/AlarmSettings';
import { formatLocalAlarmTime } from '../alarm/localTime';
import { I18nManager } from '../i18n/I18nManager';

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
});
