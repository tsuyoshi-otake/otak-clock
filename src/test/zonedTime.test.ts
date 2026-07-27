import * as assert from 'assert';
import { getSystemDateTime, getWallClock, getZonedDateTime } from '../timezone/zonedTime';

suite('zonedTime', () => {
    suite('getZonedDateTime', () => {
        test('resolves wall clock fields in the target zone', () => {
            const zoned = getZonedDateTime(Date.parse('2024-06-15T03:30:45Z'), 'Asia/Tokyo');
            assert.deepStrictEqual(
                {
                    year: zoned.year, month: zoned.month, day: zoned.day,
                    hour: zoned.hour, minute: zoned.minute, second: zoned.second
                },
                { year: 2024, month: 6, day: 15, hour: 12, minute: 30, second: 45 }
            );
        });

        test('uses 1-based months, not the Date.getMonth() convention', () => {
            assert.strictEqual(getZonedDateTime(Date.parse('2024-01-15T12:00:00Z'), 'UTC').month, 1);
            assert.strictEqual(getZonedDateTime(Date.parse('2024-12-15T12:00:00Z'), 'UTC').month, 12);
        });

        test('reports midnight as hour 0, not 24', () => {
            const zoned = getZonedDateTime(Date.parse('2024-06-14T15:00:00Z'), 'Asia/Tokyo');
            assert.strictEqual(zoned.hour, 0);
            assert.strictEqual(zoned.day, 15);
        });

        test('derives the offset from the same resolution as the fields', () => {
            assert.strictEqual(getZonedDateTime(Date.parse('2024-06-15T12:00:00Z'), 'Asia/Tokyo').offsetMinutes, 540);
            assert.strictEqual(getZonedDateTime(Date.parse('2024-06-15T12:00:00Z'), 'UTC').offsetMinutes, 0);
            assert.strictEqual(getZonedDateTime(Date.parse('2024-06-15T12:00:00Z'), 'Asia/Kolkata').offsetMinutes, 330);
            assert.strictEqual(getZonedDateTime(Date.parse('2024-06-15T12:00:00Z'), 'Pacific/Chatham').offsetMinutes, 765);
        });

        test('tracks DST transitions', () => {
            // 2024-03-10 07:00Z is the instant America/New_York springs forward.
            const before = getZonedDateTime(Date.parse('2024-03-10T06:59:00Z'), 'America/New_York');
            const after = getZonedDateTime(Date.parse('2024-03-10T07:00:00Z'), 'America/New_York');
            assert.strictEqual(before.offsetMinutes, -300);
            assert.strictEqual(before.hour, 1);
            assert.strictEqual(after.offsetMinutes, -240);
            assert.strictEqual(after.hour, 3);
        });

        test('round-trips a negative offset zone', () => {
            const zoned = getZonedDateTime(Date.parse('2024-01-15T02:30:00Z'), 'America/New_York');
            assert.strictEqual(zoned.day, 14);
            assert.strictEqual(zoned.hour, 21);
            assert.strictEqual(zoned.minute, 30);
        });

        test('throws for an invalid timezone', () => {
            assert.throws(() => getZonedDateTime(Date.now(), 'Invalid/Zone'));
        });
    });

    suite('getSystemDateTime', () => {
        test('matches the native Date getters', () => {
            const timeMs = Date.parse('2024-06-15T03:30:45Z');
            const date = new Date(timeMs);
            const zoned = getSystemDateTime(timeMs);
            assert.strictEqual(zoned.year, date.getFullYear());
            assert.strictEqual(zoned.month, date.getMonth() + 1);
            assert.strictEqual(zoned.day, date.getDate());
            assert.strictEqual(zoned.hour, date.getHours());
            assert.strictEqual(zoned.minute, date.getMinutes());
            assert.strictEqual(zoned.second, date.getSeconds());
            assert.strictEqual(zoned.offsetMinutes, -date.getTimezoneOffset());
        });
    });

    suite('getWallClock', () => {
        test('uses the system zone when no timezone is given', () => {
            const timeMs = Date.parse('2024-06-15T03:30:45Z');
            assert.deepStrictEqual(getWallClock(timeMs, undefined), getSystemDateTime(timeMs));
        });

        test('uses the named zone when one is given', () => {
            const timeMs = Date.parse('2024-06-15T03:30:45Z');
            assert.deepStrictEqual(getWallClock(timeMs, 'Asia/Tokyo'), getZonedDateTime(timeMs, 'Asia/Tokyo'));
        });
    });
});
