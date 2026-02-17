import * as assert from 'assert';
import { getFormatters, getStatusBarTimeZoneLabel } from '../clock/formatters';
import { TimeZoneInfo } from '../timezone/types';

suite('formatters', () => {
    suite('getFormatters', () => {
        test('returns a FormatterPair for a valid timezone', () => {
            const pair = getFormatters('Asia/Tokyo');
            assert.ok(pair.timeWithSeconds);
            assert.ok(pair.timeNoSeconds);
            assert.ok(pair.date);
            assert.ok(pair.timeZoneName);
        });

        test('returns cached instance on second call', () => {
            const pair1 = getFormatters('Europe/London');
            const pair2 = getFormatters('Europe/London');
            assert.strictEqual(pair1, pair2);
        });

        test('throws for invalid timezone', () => {
            assert.throws(() => getFormatters('Invalid/Zone'));
        });
    });

    suite('getStatusBarTimeZoneLabel', () => {
        test('returns JST for Asia/Tokyo', () => {
            const tz: TimeZoneInfo = { label: 'Japan (Tokyo)', timeZoneId: 'Asia/Tokyo', region: 'Asia', baseUtcOffset: 9 };
            const formatters = getFormatters('Asia/Tokyo');
            const label = getStatusBarTimeZoneLabel(new Date(), tz, formatters);
            assert.strictEqual(label, 'JST');
        });

        test('returns a label for UTC', () => {
            const tz: TimeZoneInfo = { label: 'Coordinated Universal Time', timeZoneId: 'UTC', region: 'Universal Time', baseUtcOffset: 0 };
            const formatters = getFormatters('UTC');
            const label = getStatusBarTimeZoneLabel(new Date(), tz, formatters);
            assert.ok(label.length > 0);
        });

        test('normalizes GMT+ to UTC+ prefix', () => {
            // Europe/Paris should return CET/CEST or UTC+X depending on DST
            const tz: TimeZoneInfo = { label: 'France (Paris)', timeZoneId: 'Europe/Paris', region: 'Europe', baseUtcOffset: 1 };
            const formatters = getFormatters('Europe/Paris');
            const label = getStatusBarTimeZoneLabel(new Date(), tz, formatters);
            assert.ok(!label.startsWith('GMT'), `Expected no GMT prefix, got: ${label}`);
        });

        test('returns EST in winter for America/New_York', () => {
            // January is always standard time (EST)
            const winter = new Date(2026, 0, 15, 12, 0, 0);
            const tz: TimeZoneInfo = { label: 'US Eastern (New York)', timeZoneId: 'America/New_York', region: 'Americas', baseUtcOffset: -5 };
            const formatters = getFormatters('America/New_York');
            const label = getStatusBarTimeZoneLabel(winter, tz, formatters);
            assert.strictEqual(label, 'EST');
        });

        test('returns EDT in summer for America/New_York', () => {
            // July is always daylight saving time (EDT)
            const summer = new Date(2026, 6, 15, 12, 0, 0);
            const tz: TimeZoneInfo = { label: 'US Eastern (New York)', timeZoneId: 'America/New_York', region: 'Americas', baseUtcOffset: -5 };
            const formatters = getFormatters('America/New_York');
            const label = getStatusBarTimeZoneLabel(summer, tz, formatters);
            assert.strictEqual(label, 'EDT');
        });

        test('returns non-empty label without GMT prefix for Asia/Kolkata', () => {
            const tz: TimeZoneInfo = { label: 'India (New Delhi)', timeZoneId: 'Asia/Kolkata', region: 'Asia', baseUtcOffset: 5.5 };
            const formatters = getFormatters('Asia/Kolkata');
            const label = getStatusBarTimeZoneLabel(new Date(), tz, formatters);
            assert.ok(label.length > 0, 'Expected non-empty label');
            assert.ok(!label.startsWith('GMT'), `Expected no GMT prefix, got: ${label}`);
        });
    });
});
