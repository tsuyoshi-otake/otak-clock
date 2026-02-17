import * as assert from 'assert';
import { msUntilNextSecond, msUntilNextMinute } from '../utils/timing';

suite('timing', () => {
    suite('msUntilNextSecond', () => {
        test('returns 1000 when exactly on a second boundary', () => {
            assert.strictEqual(msUntilNextSecond(5000), 1000);
        });

        test('returns remaining ms to next second', () => {
            assert.strictEqual(msUntilNextSecond(5500), 500);
        });

        test('returns 1 when 999ms into a second', () => {
            assert.strictEqual(msUntilNextSecond(5999), 1);
        });

        test('handles zero', () => {
            assert.strictEqual(msUntilNextSecond(0), 1000);
        });
    });

    suite('msUntilNextMinute', () => {
        test('returns 60000 when exactly on a minute boundary', () => {
            assert.strictEqual(msUntilNextMinute(60000), 60000);
        });

        test('returns remaining ms to next minute', () => {
            assert.strictEqual(msUntilNextMinute(90000), 30000);
        });

        test('returns 1 when 59999ms into a minute', () => {
            assert.strictEqual(msUntilNextMinute(59999), 1);
        });

        test('handles zero', () => {
            assert.strictEqual(msUntilNextMinute(0), 60000);
        });
    });
});
