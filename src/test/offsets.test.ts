import * as assert from 'assert';
import { formatUtcOffsetLabel, getUtcOffsetMinutes } from '../timezone/offsets';

suite('offsets', () => {
    suite('formatUtcOffsetLabel', () => {
        test('formats positive offset', () => {
            assert.strictEqual(formatUtcOffsetLabel(540), 'UTC+09:00');
        });

        test('formats negative offset', () => {
            assert.strictEqual(formatUtcOffsetLabel(-300), 'UTC-05:00');
        });

        test('formats zero offset', () => {
            assert.strictEqual(formatUtcOffsetLabel(0), 'UTC+00:00');
        });

        test('formats half-hour offset', () => {
            assert.strictEqual(formatUtcOffsetLabel(330), 'UTC+05:30');
        });

        test('formats negative half-hour offset', () => {
            assert.strictEqual(formatUtcOffsetLabel(-210), 'UTC-03:30');
        });

        test('formats 45-minute offset (Nepal)', () => {
            assert.strictEqual(formatUtcOffsetLabel(345), 'UTC+05:45');
        });
    });

    suite('getUtcOffsetMinutes', () => {
        test('returns 0 for UTC', () => {
            const date = new Date('2024-06-15T12:00:00Z');
            assert.strictEqual(getUtcOffsetMinutes(date, 'UTC'), 0);
        });

        test('returns 540 for Asia/Tokyo (no DST)', () => {
            const date = new Date('2024-06-15T12:00:00Z');
            assert.strictEqual(getUtcOffsetMinutes(date, 'Asia/Tokyo'), 540);
        });

        test('returns correct offset for America/New_York in winter (EST)', () => {
            const date = new Date('2024-01-15T12:00:00Z');
            assert.strictEqual(getUtcOffsetMinutes(date, 'America/New_York'), -300);
        });

        test('returns correct offset for America/New_York in summer (EDT)', () => {
            const date = new Date('2024-06-15T12:00:00Z');
            assert.strictEqual(getUtcOffsetMinutes(date, 'America/New_York'), -240);
        });

        test('returns 345 for Asia/Kathmandu (UTC+05:45)', () => {
            const date = new Date('2024-06-15T12:00:00Z');
            assert.strictEqual(getUtcOffsetMinutes(date, 'Asia/Kathmandu'), 345);
        });
    });
});
