import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { I18nConfig, SupportedLocale, TranslationMessages } from './types';

/**
 * Simple JSON-based i18n loader, modeled after otak-proxy.
 * Translation files are loaded from `out/i18n/locales/*.json` at runtime.
 */
export class I18nManager {
    private static instance: I18nManager;
    private currentLocale: SupportedLocale;
    private messages: TranslationMessages;
    private fallbackMessages: TranslationMessages;
    private config: I18nConfig;

    private constructor() {
        this.config = {
            defaultLocale: 'en',
            supportedLocales: [
                'ar',
                'de',
                'en',
                'es',
                'fr',
                'hi',
                'id',
                'it',
                'ja',
                'ko',
                'nl',
                'pt',
                'ru',
                'th',
                'tr',
                'vi',
                'zh-cn',
                'zh-tw'
            ],
            fallbackLocale: 'en'
        };
        this.currentLocale = this.config.defaultLocale;
        this.messages = {};
        this.fallbackMessages = {};
    }

    public static getInstance(): I18nManager {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
        }
        return I18nManager.instance;
    }

    /**
     * Initialize the I18nManager by detecting the language and loading translation files.
     * @param locale Optional locale. If not provided, detects from vscode.env.language.
     */
    public initialize(locale?: string): void {
        const detected = locale || vscode.env.language;
        const resolved = this.resolveLocale(detected);
        this.currentLocale = resolved;

        this.loadTranslations();
    }

    public getCurrentLocale(): SupportedLocale {
        return this.currentLocale;
    }

    public t(key: string, params?: Record<string, string>): string {
        let message = this.messages[key] ?? this.fallbackMessages[key];
        if (!message) {
            return `[missing: ${key}]`;
        }

        if (params) {
            message = this.substituteParams(message, params);
        }

        return message;
    }

    private resolveLocale(locale: string): SupportedLocale {
        // vscode.env.language can be like:
        // - "en", "ja", "ko"
        // - "en-US", "ko-KR"
        // - "zh-cn", "zh-tw"
        // - "zh-Hans", "zh-Hant"
        //
        // We support a small set. Prefer exact matches, then fall back.
        const lower = locale.toLowerCase().replace(/_/g, '-');

        // Chinese script aliases.
        if (lower === 'zh-hans' || lower.startsWith('zh-hans-')) {
            return 'zh-cn';
        }
        if (lower === 'zh-hant' || lower.startsWith('zh-hant-')) {
            return 'zh-tw';
        }

        // Common region aliases.
        if (lower === 'zh-hk' || lower.startsWith('zh-hk-')) {
            return 'zh-tw';
        }

        if (this.isSupportedLocale(lower)) {
            return lower;
        }

        const base = lower.split('-')[0];
        if (this.isSupportedLocale(base)) {
            return base;
        }

        // If VS Code ever returns a bare "zh", default to Simplified.
        if (base === 'zh') {
            return 'zh-cn';
        }

        return this.config.fallbackLocale;
    }

    private isSupportedLocale(locale: string): locale is SupportedLocale {
        return (this.config.supportedLocales as readonly string[]).includes(locale);
    }

    private loadTranslations(): void {
        try {
            this.messages = this.loadLocaleFile(this.currentLocale);
            if (this.currentLocale !== this.config.fallbackLocale) {
                this.fallbackMessages = this.loadLocaleFile(this.config.fallbackLocale);
            } else {
                this.fallbackMessages = this.messages;
            }
        } catch {
            // Last resort: attempt fallback locale only.
            try {
                this.messages = this.loadLocaleFile(this.config.fallbackLocale);
                this.fallbackMessages = this.messages;
                this.currentLocale = this.config.fallbackLocale;
            } catch {
                this.messages = {};
                this.fallbackMessages = {};
            }
        }
    }

    private loadLocaleFile(locale: SupportedLocale): TranslationMessages {
        const localeFilePath = path.join(__dirname, 'locales', `${locale}.json`);
        const fileContent = fs.readFileSync(localeFilePath, 'utf-8');
        const parsed: unknown = JSON.parse(fileContent);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed as TranslationMessages;
    }

    private substituteParams(message: string, params: Record<string, string>): string {
        let result = message;
        for (const [key, value] of Object.entries(params)) {
            result = result.replaceAll(`{${key}}`, value);
        }
        return result;
    }
}
