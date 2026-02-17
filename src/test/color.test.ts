import * as assert from 'assert';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from '../utils/color';

suite('color', () => {
    suite('hexToRgb', () => {
        test('parses 6-digit hex with hash', () => {
            assert.deepStrictEqual(hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 });
        });

        test('parses 6-digit hex without hash', () => {
            assert.deepStrictEqual(hexToRgb('00ff00'), { r: 0, g: 255, b: 0 });
        });

        test('parses 3-digit shorthand hex', () => {
            assert.deepStrictEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
        });

        test('parses black', () => {
            assert.deepStrictEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
        });

        test('returns null for invalid length', () => {
            assert.strictEqual(hexToRgb('#abcd'), null);
        });

        test('returns null for empty string', () => {
            assert.strictEqual(hexToRgb(''), null);
        });

        test('parses mixed case', () => {
            assert.deepStrictEqual(hexToRgb('#AaBbCc'), { r: 170, g: 187, b: 204 });
        });

        test('returns null for non-hex characters', () => {
            assert.strictEqual(hexToRgb('xyz'), null);
        });
    });

    suite('rgbToHex', () => {
        test('converts red', () => {
            assert.strictEqual(rgbToHex(255, 0, 0), '#ff0000');
        });

        test('converts black', () => {
            assert.strictEqual(rgbToHex(0, 0, 0), '#000000');
        });

        test('converts white', () => {
            assert.strictEqual(rgbToHex(255, 255, 255), '#ffffff');
        });

        test('pads single-digit hex values', () => {
            assert.strictEqual(rgbToHex(1, 2, 3), '#010203');
        });
    });

    suite('rgbToHsl', () => {
        test('converts pure red', () => {
            const hsl = rgbToHsl(255, 0, 0);
            assert.strictEqual(hsl.h, 0);
            assert.strictEqual(hsl.s, 1);
            assert.strictEqual(hsl.l, 0.5);
        });

        test('converts pure green', () => {
            const hsl = rgbToHsl(0, 255, 0);
            assert.strictEqual(hsl.h, 120);
            assert.strictEqual(hsl.s, 1);
            assert.strictEqual(hsl.l, 0.5);
        });

        test('converts pure blue', () => {
            const hsl = rgbToHsl(0, 0, 255);
            assert.strictEqual(hsl.h, 240);
            assert.strictEqual(hsl.s, 1);
            assert.strictEqual(hsl.l, 0.5);
        });

        test('converts gray (achromatic)', () => {
            const hsl = rgbToHsl(128, 128, 128);
            assert.strictEqual(hsl.h, 0);
            assert.strictEqual(hsl.s, 0);
            assert.ok(Math.abs(hsl.l - 128 / 255) < 0.01);
        });

        test('converts white', () => {
            const hsl = rgbToHsl(255, 255, 255);
            assert.strictEqual(hsl.h, 0);
            assert.strictEqual(hsl.s, 0);
            assert.strictEqual(hsl.l, 1);
        });
    });

    suite('hslToRgb', () => {
        test('converts red (h=0, s=1, l=0.5)', () => {
            const rgb = hslToRgb(0, 1, 0.5);
            assert.strictEqual(rgb.r, 255);
            assert.strictEqual(rgb.g, 0);
            assert.strictEqual(rgb.b, 0);
        });

        test('converts achromatic (s=0)', () => {
            const rgb = hslToRgb(0, 0, 0.5);
            assert.strictEqual(rgb.r, 128);
            assert.strictEqual(rgb.g, 128);
            assert.strictEqual(rgb.b, 128);
        });

        test('converts green (h=120, s=1, l=0.5)', () => {
            const rgb = hslToRgb(120, 1, 0.5);
            assert.strictEqual(rgb.r, 0);
            assert.strictEqual(rgb.g, 255);
            assert.strictEqual(rgb.b, 0);
        });

        test('converts blue (h=240, s=1, l=0.5)', () => {
            const rgb = hslToRgb(240, 1, 0.5);
            assert.strictEqual(rgb.r, 0);
            assert.strictEqual(rgb.g, 0);
            assert.strictEqual(rgb.b, 255);
        });
    });

    suite('round-trip', () => {
        test('hex -> rgb -> hex preserves value', () => {
            const original = '#1a2b3c';
            const rgb = hexToRgb(original);
            assert.ok(rgb);
            const result = rgbToHex(rgb.r, rgb.g, rgb.b);
            assert.strictEqual(result, original);
        });

        test('rgb -> hsl -> rgb preserves value for primary colors', () => {
            const testCases = [
                { r: 255, g: 0, b: 0 },
                { r: 0, g: 255, b: 0 },
                { r: 0, g: 0, b: 255 },
                { r: 255, g: 255, b: 255 },
                { r: 0, g: 0, b: 0 },
            ];
            for (const { r, g, b } of testCases) {
                const hsl = rgbToHsl(r, g, b);
                const result = hslToRgb(hsl.h, hsl.s, hsl.l);
                assert.strictEqual(result.r, r, `r mismatch for (${r},${g},${b})`);
                assert.strictEqual(result.g, g, `g mismatch for (${r},${g},${b})`);
                assert.strictEqual(result.b, b, `b mismatch for (${r},${g},${b})`);
            }
        });
    });
});
