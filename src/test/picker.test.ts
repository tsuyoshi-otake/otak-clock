import * as assert from 'assert';
import { compareRegions, buildTimeZonePickerItem } from '../timezone/picker';
import { I18nManager } from '../i18n/I18nManager';
import { TimeZoneInfo } from '../timezone/types';

suite('picker', () => {
    let i18n: I18nManager;

    setup(() => {
        i18n = I18nManager.getInstance();
        i18n.initialize('en');
    });

    suite('compareRegions', () => {
        test('Universal Time always comes first', () => {
            assert.ok(compareRegions('Universal Time', 'Europe', i18n) < 0);
            assert.ok(compareRegions('Universal Time', 'Americas', i18n) < 0);
        });

        test('other regions sort alphabetically', () => {
            assert.ok(compareRegions('Americas', 'Europe', i18n) < 0);
            assert.ok(compareRegions('Europe', 'Pacific', i18n) < 0);
        });

        test('symmetry: if a < b then b > a', () => {
            const result1 = compareRegions('Americas', 'Europe', i18n);
            const result2 = compareRegions('Europe', 'Americas', i18n);
            assert.ok(result1 < 0);
            assert.ok(result2 > 0);
        });

        test('both Universal Time returns negative', () => {
            assert.ok(compareRegions('Universal Time', 'Universal Time', i18n) < 0);
        });

        test('second argument Universal Time returns positive', () => {
            assert.ok(compareRegions('Europe', 'Universal Time', i18n) > 0);
        });
    });

    suite('buildTimeZonePickerItem', () => {
        test('Tokyo returns label, UTC+09:00, and IANA id', () => {
            const tz: TimeZoneInfo = { label: 'Japan (Tokyo)', timeZoneId: 'Asia/Tokyo', region: 'Asia', baseUtcOffset: 9 };
            const now = new Date(2026, 0, 15, 12, 0, 0);
            const item = buildTimeZonePickerItem(tz, now, i18n);
            assert.strictEqual(item.label, 'Japan (Tokyo)');
            assert.ok(item.description.includes('UTC+09:00'), `Expected UTC+09:00 in description: ${item.description}`);
            assert.strictEqual(item.detail, 'Asia/Tokyo');
        });

        test('New York in summer includes DST suffix', () => {
            const tz: TimeZoneInfo = { label: 'US Eastern (New York)', timeZoneId: 'America/New_York', region: 'Americas', baseUtcOffset: -5 };
            // July is always DST for New York
            const summer = new Date(2026, 6, 15, 12, 0, 0);
            const item = buildTimeZonePickerItem(tz, summer, i18n);
            assert.strictEqual(item.detail, 'America/New_York');
            // DST offset is -4h (UTC-04:00) vs base -5h, so DST suffix should be present
            assert.ok(item.description.includes('UTC-04:00'), `Expected UTC-04:00 in description: ${item.description}`);
        });
    });
});
