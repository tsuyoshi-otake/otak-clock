import { FormatterPair, TimeZoneInfo } from '../timezone/types';
import { FORMATTER_CACHE_MAX_SIZE } from './constants';

const formatterCache = new Map<string, FormatterPair>();

export function getFormatters(timeZoneId: string): FormatterPair {
    const cached = formatterCache.get(timeZoneId);
    if (cached) {
        return cached;
    }

    const formatters: FormatterPair = {
        timeWithSeconds: new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: timeZoneId
        }),
        timeNoSeconds: new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timeZoneId
        }),
        date: new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: timeZoneId
        }),
        timeZoneName: new Intl.DateTimeFormat('en-US', {
            timeZone: timeZoneId,
            timeZoneName: 'short'
        })
    };

    if (formatterCache.size >= FORMATTER_CACHE_MAX_SIZE) {
        const oldest = formatterCache.keys().next().value;
        if (oldest !== undefined) {
            formatterCache.delete(oldest);
        }
    }

    formatterCache.set(timeZoneId, formatters);
    return formatters;
}

export function getStatusBarTimeZoneLabel(now: Date, timeZone: TimeZoneInfo, formatters: FormatterPair): string {
    // Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }) returns "GMT+9" for Asia/Tokyo,
    // but Japanese developers commonly expect "JST" for quick scanning in the status bar.
    if (timeZone.timeZoneId === 'Asia/Tokyo') {
        return 'JST';
    }

    const tzPart = formatters.timeZoneName.formatToParts(now).find(p => p.type === 'timeZoneName')?.value;
    if (!tzPart) {
        return timeZone.timeZoneId;
    }

    // Normalize "GMT+X" to "UTC+X" for consistency with other UI strings in this extension.
    if (tzPart.startsWith('GMT')) {
        return `UTC${tzPart.slice(3)}`;
    }

    return tzPart;
}
