import * as assert from 'assert';
import { buildTooltipText } from '../clock/tooltips';
import { getZoneMinuteState } from '../timezone/formatters';
import { TimeZoneInfo } from '../timezone/types';
import { I18nManager } from '../i18n/I18nManager';

suite('tooltips', () => {
    const mockTimeZone: TimeZoneInfo = {
        label: 'Japan (Tokyo)',
        timeZoneId: 'Asia/Tokyo',
        region: 'Asia',
        baseUtcOffset: 9
    };

    suite('buildTooltipText', () => {
        let i18n: I18nManager;

        setup(() => {
            i18n = I18nManager.getInstance();
            i18n.initialize('en');
        });

        function build(timeZone: TimeZoneInfo, iso: string): string {
            const timeMs = Date.parse(iso);
            return buildTooltipText(getZoneMinuteState(timeMs, timeZone.timeZoneId), timeZone, i18n);
        }

        test('includes timezone label and IANA id', () => {
            const result = build(mockTimeZone, '2024-01-15T03:30:00Z');
            assert.ok(result.includes('Japan (Tokyo)'));
            assert.ok(result.includes('Asia/Tokyo'));
        });

        test('includes the local date', () => {
            const result = build(mockTimeZone, '2024-01-15T03:30:00Z');
            assert.ok(result.includes('01/15/2024'), `Expected local date in tooltip: ${result}`);
        });

        test('shows DST info for New York in summer', () => {
            const nyTz: TimeZoneInfo = {
                label: 'US Eastern (New York)',
                timeZoneId: 'America/New_York',
                region: 'Americas',
                baseUtcOffset: -5
            };
            // June = EDT (UTC-4), base is UTC-5 => DST
            const result = build(nyTz, '2024-06-15T12:00:00Z');
            assert.ok(result.includes('DST'), `Expected DST info in tooltip: ${result}`);
            assert.ok(result.includes('UTC-04:00'), `Expected the DST offset in tooltip: ${result}`);
        });

        test('does not show DST info for New York in winter', () => {
            const nyTz: TimeZoneInfo = {
                label: 'US Eastern (New York)',
                timeZoneId: 'America/New_York',
                region: 'Americas',
                baseUtcOffset: -5
            };
            const result = build(nyTz, '2024-01-15T12:00:00Z');
            assert.ok(!result.includes('DST'), `Unexpected DST info in tooltip: ${result}`);
            assert.ok(result.includes('UTC-05:00'), `Expected the standard offset in tooltip: ${result}`);
        });

        test('does not show DST info for Tokyo (no DST)', () => {
            const result = build(mockTimeZone, '2024-06-15T03:30:00Z');
            assert.ok(!result.includes('DST'), `Unexpected DST info in tooltip: ${result}`);
        });

        test('includes UTC offset string', () => {
            const result = build(mockTimeZone, '2024-06-15T03:30:00Z');
            assert.ok(result.includes('UTC+09:00'), `Expected UTC offset in tooltip: ${result}`);
        });

        test('formats a half-hour offset', () => {
            const indiaTz: TimeZoneInfo = {
                label: 'India (New Delhi)',
                timeZoneId: 'Asia/Kolkata',
                region: 'Asia',
                baseUtcOffset: 5.5
            };
            const result = build(indiaTz, '2024-06-15T03:30:00Z');
            assert.ok(result.includes('UTC+05:30'), `Expected UTC+05:30 in tooltip: ${result}`);
        });

        test('includes click-to-change hint', () => {
            const result = build(mockTimeZone, '2024-06-15T03:30:00Z');
            assert.ok(result.includes('Click to change'), `Expected click hint in tooltip: ${result}`);
        });
    });
});
