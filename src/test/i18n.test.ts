import * as assert from 'assert';
import { I18nManager } from '../i18n/I18nManager';

suite('i18n', () => {
    let i18n: I18nManager;

    setup(() => {
        i18n = I18nManager.getInstance();
    });

    suite('resolveLocale', () => {
        test('resolves "en" to en', () => {
            i18n.initialize('en');
            assert.strictEqual(i18n.getCurrentLocale(), 'en');
        });

        test('resolves "ja" to ja', () => {
            i18n.initialize('ja');
            assert.strictEqual(i18n.getCurrentLocale(), 'ja');
        });

        test('resolves "en-US" to en', () => {
            i18n.initialize('en-US');
            assert.strictEqual(i18n.getCurrentLocale(), 'en');
        });

        test('resolves "ko-KR" to ko', () => {
            i18n.initialize('ko-KR');
            assert.strictEqual(i18n.getCurrentLocale(), 'ko');
        });

        test('resolves "zh-Hans" to zh-cn', () => {
            i18n.initialize('zh-Hans');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-cn');
        });

        test('resolves "zh-Hant" to zh-tw', () => {
            i18n.initialize('zh-Hant');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-tw');
        });

        test('resolves "zh-HK" to zh-tw', () => {
            i18n.initialize('zh-HK');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-tw');
        });

        test('resolves bare "zh" to zh-cn', () => {
            i18n.initialize('zh');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-cn');
        });

        test('resolves "zh_CN" (underscore) to zh-cn', () => {
            i18n.initialize('zh_CN');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-cn');
        });

        test('resolves unknown locale to en (fallback)', () => {
            i18n.initialize('xx-YY');
            assert.strictEqual(i18n.getCurrentLocale(), 'en');
        });

        test('resolves "fr" to fr', () => {
            i18n.initialize('fr');
            assert.strictEqual(i18n.getCurrentLocale(), 'fr');
        });

        test('resolves "de-AT" to de', () => {
            i18n.initialize('de-AT');
            assert.strictEqual(i18n.getCurrentLocale(), 'de');
        });

        test('resolves "pt-BR" to pt', () => {
            i18n.initialize('pt-BR');
            assert.strictEqual(i18n.getCurrentLocale(), 'pt');
        });

        test('resolves "zh-Hans-CN" to zh-cn', () => {
            i18n.initialize('zh-Hans-CN');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-cn');
        });

        test('resolves "zh-Hant-TW" to zh-tw', () => {
            i18n.initialize('zh-Hant-TW');
            assert.strictEqual(i18n.getCurrentLocale(), 'zh-tw');
        });
    });

    suite('substituteParams (via t())', () => {
        setup(() => {
            i18n.initialize('en');
        });

        test('substitutes a single parameter', () => {
            const result = i18n.t('alarm.message.set', { time: '09:00' });
            assert.strictEqual(result, 'Alarm set for 09:00');
        });

        test('substitutes multiple parameters', () => {
            const result = i18n.t('alarm.menu.placeholder', { time: '14:30', status: 'Enabled', fired: '' });
            assert.strictEqual(result, 'Alarm: 14:30 (Enabled)');
        });

        test('returns missing key indicator for unknown key', () => {
            const result = i18n.t('nonexistent.key');
            assert.strictEqual(result, '[missing: nonexistent.key]');
        });

        test('returns message without substitution when no params given', () => {
            const result = i18n.t('alarm.message.noAlarmSet');
            assert.strictEqual(result, 'No alarm set.');
        });

        test('substitutes value containing dollar sign correctly', () => {
            const result = i18n.t('alarm.message.set', { time: '$100' });
            assert.strictEqual(result, 'Alarm set for $100');
        });

        test('substitutes same placeholder appearing multiple times', () => {
            const result = i18n.t('alarm.menu.placeholder', { time: '09:00', status: '09:00', fired: '' });
            assert.strictEqual(result, 'Alarm: 09:00 (09:00)');
        });
    });
});
