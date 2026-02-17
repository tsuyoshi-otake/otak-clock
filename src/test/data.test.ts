import * as assert from 'assert';
import { timeZones, regionTranslationKeys, findTimeZoneById, localizeRegion, UTC_FALLBACK_TIMEZONE } from '../timezone/data';
import { I18nManager } from '../i18n/I18nManager';

suite('timezone data', () => {
    suite('dataset integrity', () => {
        test('has no duplicate timeZoneId entries', () => {
            const ids = timeZones.map(tz => tz.timeZoneId);
            const unique = new Set(ids);
            assert.strictEqual(unique.size, ids.length, 'Duplicate timeZoneId found');
        });

        test('all timeZoneId values are valid IANA identifiers', () => {
            for (const tz of timeZones) {
                assert.doesNotThrow(() => {
                    new Intl.DateTimeFormat('en-US', { timeZone: tz.timeZoneId });
                }, `Invalid IANA timeZoneId: ${tz.timeZoneId}`);
            }
        });

        test('all regions have a translation key', () => {
            const regions = new Set(timeZones.map(tz => tz.region));
            for (const region of regions) {
                assert.ok(
                    regionTranslationKeys[region],
                    `Missing translation key for region: ${region}`
                );
            }
        });

        test('all entries have non-empty label and region', () => {
            for (const tz of timeZones) {
                assert.ok(tz.label.length > 0, `Empty label for ${tz.timeZoneId}`);
                assert.ok(tz.region.length > 0, `Empty region for ${tz.timeZoneId}`);
            }
        });

        test('baseUtcOffset is a finite number for all entries', () => {
            for (const tz of timeZones) {
                assert.ok(Number.isFinite(tz.baseUtcOffset), `Non-finite offset for ${tz.timeZoneId}`);
            }
        });
    });

    suite('findTimeZoneById', () => {
        test('finds a known timezone', () => {
            const result = findTimeZoneById('Asia/Tokyo');
            assert.ok(result);
            assert.strictEqual(result.timeZoneId, 'Asia/Tokyo');
            assert.strictEqual(result.region, 'Asia');
        });

        test('returns undefined for unknown id', () => {
            assert.strictEqual(findTimeZoneById('Invalid/Zone'), undefined);
        });

        test('returns undefined for empty string', () => {
            assert.strictEqual(findTimeZoneById(''), undefined);
        });

        test('returns undefined for case-mismatched id (asia/tokyo)', () => {
            assert.strictEqual(findTimeZoneById('asia/tokyo'), undefined);
        });
    });

    suite('UTC_FALLBACK_TIMEZONE', () => {
        test('is the same reference as timeZones[0]', () => {
            assert.strictEqual(UTC_FALLBACK_TIMEZONE, timeZones[0]);
        });
    });

    suite('localizeRegion', () => {
        test('returns translated region for known key', () => {
            const i18n = I18nManager.getInstance();
            i18n.initialize('en');
            const result = localizeRegion('Asia', i18n);
            assert.strictEqual(result, 'Asia');
        });

        test('returns raw region string for unknown key', () => {
            const i18n = I18nManager.getInstance();
            i18n.initialize('en');
            const result = localizeRegion('UnknownRegion', i18n);
            assert.strictEqual(result, 'UnknownRegion');
        });
    });
});
