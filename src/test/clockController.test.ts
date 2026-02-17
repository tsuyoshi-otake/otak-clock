import * as assert from 'assert';
import { coerceTimeZoneId } from '../clock/ClockController';

suite('ClockController', () => {
    suite('coerceTimeZoneId', () => {
        test('returns undefined for null', () => {
            assert.strictEqual(coerceTimeZoneId(null), undefined);
        });

        test('returns undefined for unknown string timeZoneId', () => {
            assert.strictEqual(coerceTimeZoneId('Invalid/Zone'), undefined);
        });

        test('returns valid timeZoneId for string Asia/Tokyo', () => {
            assert.strictEqual(coerceTimeZoneId('Asia/Tokyo'), 'Asia/Tokyo');
        });

        test('returns undefined for empty object', () => {
            assert.strictEqual(coerceTimeZoneId({}), undefined);
        });

        test('returns undefined for non-string timeZoneId', () => {
            assert.strictEqual(coerceTimeZoneId({ timeZoneId: 123 }), undefined);
        });

        test('returns undefined for unknown timeZoneId', () => {
            assert.strictEqual(coerceTimeZoneId({ timeZoneId: 'Invalid/Zone' }), undefined);
        });

        test('returns valid timeZoneId for Asia/Tokyo', () => {
            assert.strictEqual(coerceTimeZoneId({ timeZoneId: 'Asia/Tokyo' }), 'Asia/Tokyo');
        });

        test('returns valid timeZoneId for UTC', () => {
            assert.strictEqual(coerceTimeZoneId({ timeZoneId: 'UTC' }), 'UTC');
        });

        test('returns undefined for undefined input', () => {
            assert.strictEqual(coerceTimeZoneId(undefined), undefined);
        });

        test('returns undefined for boolean input', () => {
            assert.strictEqual(coerceTimeZoneId(true), undefined);
        });
    });
});
