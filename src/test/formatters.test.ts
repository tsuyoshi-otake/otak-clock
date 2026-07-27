import * as assert from 'assert';
import {
    formatClockText,
    getTimeZoneShortLabel,
    getTimeZoneShortLabelAt,
    getZoneMinuteState
} from '../timezone/formatters';

suite('formatters', () => {
    suite('getZoneMinuteState', () => {
        test('resolves wall clock fields for a valid timezone', () => {
            const state = getZoneMinuteState(Date.parse('2024-06-15T03:30:45Z'), 'Asia/Tokyo');
            assert.strictEqual(state.hourMinuteText, '12:30');
            assert.strictEqual(state.dateText, '06/15/2024');
            assert.strictEqual(state.offsetMinutes, 540);
        });

        test('pads midnight as 00 rather than 24', () => {
            const state = getZoneMinuteState(Date.parse('2024-06-14T15:00:00Z'), 'Asia/Tokyo');
            assert.strictEqual(state.hourMinuteText, '00:00');
            assert.strictEqual(state.dateText, '06/15/2024');
        });

        test('returns the same object for two instants in the same minute', () => {
            const base = Date.parse('2024-06-15T03:30:00Z');
            const first = getZoneMinuteState(base, 'Europe/London');
            const second = getZoneMinuteState(base + 59_000, 'Europe/London');
            assert.strictEqual(first, second);
        });

        test('recomputes on the next minute', () => {
            const base = Date.parse('2024-06-15T03:30:00Z');
            const first = getZoneMinuteState(base, 'Europe/Berlin');
            const second = getZoneMinuteState(base + 60_000, 'Europe/Berlin');
            assert.notStrictEqual(first, second);
            assert.strictEqual(first.hourMinuteText, '05:30');
            assert.strictEqual(second.hourMinuteText, '05:31');
        });

        test('tracks DST for America/New_York', () => {
            const winter = getZoneMinuteState(Date.parse('2024-01-15T12:00:00Z'), 'America/New_York');
            const summer = getZoneMinuteState(Date.parse('2024-06-15T12:00:00Z'), 'America/New_York');
            assert.strictEqual(winter.offsetMinutes, -300);
            assert.strictEqual(summer.offsetMinutes, -240);
        });

        test('handles a half-hour offset zone', () => {
            const state = getZoneMinuteState(Date.parse('2024-06-15T03:30:00Z'), 'Asia/Kolkata');
            assert.strictEqual(state.offsetMinutes, 330);
            assert.strictEqual(state.hourMinuteText, '09:00');
        });

        test('throws for an invalid timezone', () => {
            assert.throws(() => getZoneMinuteState(Date.now(), 'Invalid/Zone'));
        });
    });

    suite('formatClockText', () => {
        const tokyoMs = Date.parse('2024-06-15T03:30:45Z');

        test('appends seconds when focused', () => {
            const state = getZoneMinuteState(tokyoMs, 'Asia/Tokyo');
            assert.strictEqual(formatClockText(state, tokyoMs, true, undefined), '12:30:45');
        });

        test('omits seconds when unfocused', () => {
            const state = getZoneMinuteState(tokyoMs, 'Asia/Tokyo');
            assert.strictEqual(formatClockText(state, tokyoMs, false, undefined), '12:30');
        });

        test('appends the label when one is supplied', () => {
            const state = getZoneMinuteState(tokyoMs, 'Asia/Tokyo');
            assert.strictEqual(formatClockText(state, tokyoMs, false, 'JST'), '12:30 JST');
            assert.strictEqual(formatClockText(state, tokyoMs, true, 'JST'), '12:30:45 JST');
        });

        test('pads single-digit seconds', () => {
            const ms = Date.parse('2024-06-15T03:30:05Z');
            const state = getZoneMinuteState(ms, 'Asia/Tokyo');
            assert.strictEqual(formatClockText(state, ms, true, undefined), '12:30:05');
        });

        test('derives seconds identically in a half-hour offset zone', () => {
            const state = getZoneMinuteState(tokyoMs, 'Asia/Kolkata');
            assert.strictEqual(formatClockText(state, tokyoMs, true, undefined), '09:00:45');
        });
    });

    suite('getTimeZoneShortLabel', () => {
        test('returns JST for Asia/Tokyo', () => {
            assert.strictEqual(getTimeZoneShortLabel('Asia/Tokyo', 540, Date.now()), 'JST');
        });

        test('returns a non-empty label for UTC', () => {
            assert.ok(getTimeZoneShortLabel('UTC', 0, Date.now()).length > 0);
        });

        test('normalizes a GMT prefix to UTC', () => {
            const label = getTimeZoneShortLabel('Europe/Paris', 120, Date.parse('2024-06-15T12:00:00Z'));
            assert.ok(!label.startsWith('GMT'), `Expected no GMT prefix, got: ${label}`);
        });

        test('returns EST in winter and EDT in summer for America/New_York', () => {
            const winter = getTimeZoneShortLabel('America/New_York', -300, Date.parse('2024-01-15T12:00:00Z'));
            const summer = getTimeZoneShortLabel('America/New_York', -240, Date.parse('2024-06-15T12:00:00Z'));
            assert.strictEqual(winter, 'EST');
            assert.strictEqual(summer, 'EDT');
        });

        test('returns a non-empty label without a GMT prefix for Asia/Kolkata', () => {
            const label = getTimeZoneShortLabel('Asia/Kolkata', 330, Date.now());
            assert.ok(label.length > 0, 'Expected non-empty label');
            assert.ok(!label.startsWith('GMT'), `Expected no GMT prefix, got: ${label}`);
        });
    });

    suite('getTimeZoneShortLabelAt', () => {
        test('resolves the label without a caller-supplied offset', () => {
            assert.strictEqual(getTimeZoneShortLabelAt('Asia/Tokyo', Date.now()), 'JST');
            assert.strictEqual(getTimeZoneShortLabelAt('America/New_York', Date.parse('2024-01-15T12:00:00Z')), 'EST');
        });

        test('falls back to the raw id for an unknown timezone', () => {
            assert.strictEqual(getTimeZoneShortLabelAt('Invalid/Zone', Date.now()), 'Invalid/Zone');
        });
    });
});
