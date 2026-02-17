import * as assert from 'assert';
import { formatClockText, buildTooltipText } from '../clock/tooltips';
import { FormatterPair, TimeZoneInfo } from '../timezone/types';
import { I18nManager } from '../i18n/I18nManager';

suite('tooltips', () => {
    const mockTimeZone: TimeZoneInfo = {
        label: 'Japan (Tokyo)',
        timeZoneId: 'Asia/Tokyo',
        region: 'Asia',
        baseUtcOffset: 9
    };

    function makeMockFormatters(timeZoneId: string = 'Asia/Tokyo'): FormatterPair {
        return {
            timeWithSeconds: new Intl.DateTimeFormat('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZone: timeZoneId
            }),
            timeNoSeconds: new Intl.DateTimeFormat('en-US', {
                hour: '2-digit', minute: '2-digit',
                hour12: false, timeZone: timeZoneId
            }),
            date: new Intl.DateTimeFormat('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                timeZone: timeZoneId
            }),
            timeZoneName: new Intl.DateTimeFormat('en-US', {
                timeZone: timeZoneId, timeZoneName: 'short'
            })
        };
    }

    suite('formatClockText', () => {
        test('formats with seconds when focused', () => {
            const now = new Date('2024-06-15T03:30:45Z'); // 12:30:45 JST
            const formatters = makeMockFormatters();
            const result = formatClockText(now, mockTimeZone, formatters, true, false, () => 'JST');
            assert.strictEqual(result, '12:30:45');
        });

        test('formats without seconds when unfocused', () => {
            const now = new Date('2024-06-15T03:30:45Z'); // 12:30 JST
            const formatters = makeMockFormatters();
            const result = formatClockText(now, mockTimeZone, formatters, false, false, () => 'JST');
            assert.strictEqual(result, '12:30');
        });

        test('appends timezone label when showTimeZoneInStatusBar is true', () => {
            const now = new Date('2024-06-15T03:30:45Z');
            const formatters = makeMockFormatters();
            const result = formatClockText(now, mockTimeZone, formatters, false, true, () => 'JST');
            assert.strictEqual(result, '12:30 JST');
        });
    });

    suite('buildTooltipText', () => {
        let i18n: I18nManager;

        setup(() => {
            i18n = I18nManager.getInstance();
            i18n.initialize('en');
        });

        test('includes timezone label and IANA id', () => {
            const now = new Date('2024-01-15T03:30:00Z');
            const formatters = makeMockFormatters();
            const result = buildTooltipText(now, mockTimeZone, formatters, i18n);
            assert.ok(result.includes('Japan (Tokyo)'));
            assert.ok(result.includes('Asia/Tokyo'));
        });

        test('shows DST info for New York in summer', () => {
            const nyTz: TimeZoneInfo = {
                label: 'US Eastern (New York)',
                timeZoneId: 'America/New_York',
                region: 'Americas',
                baseUtcOffset: -5
            };
            // June = EDT (UTC-4), base is UTC-5 => DST
            const now = new Date('2024-06-15T12:00:00Z');
            const formatters = makeMockFormatters('America/New_York');
            const result = buildTooltipText(now, nyTz, formatters, i18n);
            assert.ok(result.includes('DST'), `Expected DST info in tooltip: ${result}`);
        });

        test('does not show DST info for Tokyo (no DST)', () => {
            const now = new Date('2024-06-15T03:30:00Z');
            const formatters = makeMockFormatters();
            const result = buildTooltipText(now, mockTimeZone, formatters, i18n);
            assert.ok(!result.includes('DST'), `Unexpected DST info in tooltip: ${result}`);
        });

        test('includes UTC offset string', () => {
            const now = new Date('2024-06-15T03:30:00Z');
            const formatters = makeMockFormatters();
            const result = buildTooltipText(now, mockTimeZone, formatters, i18n);
            assert.ok(result.includes('UTC+09:00'), `Expected UTC offset in tooltip: ${result}`);
        });

        test('includes click-to-change hint', () => {
            const now = new Date('2024-06-15T03:30:00Z');
            const formatters = makeMockFormatters();
            const result = buildTooltipText(now, mockTimeZone, formatters, i18n);
            assert.ok(result.includes('Click to change'), `Expected click hint in tooltip: ${result}`);
        });
    });
});
