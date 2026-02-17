import * as assert from 'assert';
import { buildAlarmStatusBarState } from '../alarm/AlarmStatus';
import { AlarmSettings } from '../alarm/AlarmSettings';
import { I18nManager } from '../i18n/I18nManager';

suite('AlarmStatus', () => {
    let i18n: I18nManager;

    setup(() => {
        i18n = I18nManager.getInstance();
        i18n.initialize('en');
    });

    suite('buildAlarmStatusBarState', () => {
        test('undefined alarm shows bell-add text and no-alarm tooltip', () => {
            const state = buildAlarmStatusBarState(undefined, i18n);
            assert.strictEqual(state.text, '$(bell) $(add)');
            assert.ok(state.tooltip.includes('No alarm set'));
        });

        test('enabled alarm shows bell icon with time', () => {
            const alarm: AlarmSettings = { enabled: true, hour: 14, minute: 30, triggered: false };
            const state = buildAlarmStatusBarState(alarm, i18n);
            assert.strictEqual(state.text, '$(bell) 14:30');
        });

        test('disabled alarm shows bell-slash icon with time', () => {
            const alarm: AlarmSettings = { enabled: false, hour: 9, minute: 0, triggered: false };
            const state = buildAlarmStatusBarState(alarm, i18n);
            assert.strictEqual(state.text, '$(bell-slash) 09:00');
        });

        test('triggered alarm tooltip includes triggered-today message', () => {
            const alarm: AlarmSettings = { enabled: true, hour: 9, minute: 0, triggered: true, lastTriggeredOn: '2024-06-15' };
            const state = buildAlarmStatusBarState(alarm, i18n);
            assert.ok(state.tooltip.includes('Triggered'), `Expected triggered info in tooltip: ${state.tooltip}`);
        });

        test('enabled non-triggered alarm tooltip does not include triggered-today message', () => {
            const alarm: AlarmSettings = { enabled: true, hour: 9, minute: 0, triggered: false };
            const state = buildAlarmStatusBarState(alarm, i18n);
            assert.ok(!state.tooltip.includes('Triggered'), `Unexpected triggered info in tooltip: ${state.tooltip}`);
        });

        test('lastTriggeredOn present but triggered=false does not show Triggered', () => {
            const alarm: AlarmSettings = { enabled: true, hour: 9, minute: 0, triggered: false, lastTriggeredOn: '2024-06-14' };
            const state = buildAlarmStatusBarState(alarm, i18n);
            assert.ok(!state.tooltip.includes('Triggered'), `Unexpected triggered info in tooltip: ${state.tooltip}`);
        });

        test('enabled=false triggered=true does not show Triggered', () => {
            const alarm: AlarmSettings = { enabled: false, hour: 9, minute: 0, triggered: true, lastTriggeredOn: '2024-06-15' };
            const state = buildAlarmStatusBarState(alarm, i18n);
            assert.ok(!state.tooltip.includes('Triggered'), `Unexpected triggered info when disabled: ${state.tooltip}`);
        });
    });
});
