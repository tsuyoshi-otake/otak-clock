import { FORMATTER_CACHE_MAX_SIZE } from '../clock/constants';

export function formatUtcOffsetLabel(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const totalMinutes = Math.abs(offsetMinutes);
    const hh = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const mm = (totalMinutes % 60).toString().padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
}

const offsetPartsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getOffsetPartsFormatter(timeZoneId: string): Intl.DateTimeFormat {
    const cached = offsetPartsFormatterCache.get(timeZoneId);
    if (cached) {
        return cached;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZoneId,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
    });

    if (offsetPartsFormatterCache.size >= FORMATTER_CACHE_MAX_SIZE) {
        const oldest = offsetPartsFormatterCache.keys().next().value;
        if (oldest !== undefined) {
            offsetPartsFormatterCache.delete(oldest);
        }
    }

    offsetPartsFormatterCache.set(timeZoneId, formatter);
    return formatter;
}

export function getUtcOffsetMinutes(date: Date, timeZoneId: string): number {
    const parts = getOffsetPartsFormatter(timeZoneId).formatToParts(date);
    const values = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const year = Number(values.year);
    const month = Number(values.month);
    const day = Number(values.day);
    const hour = Number(values.hour);
    const minute = Number(values.minute);
    const second = Number(values.second);

    if (
        Number.isNaN(year) ||
        Number.isNaN(month) ||
        Number.isNaN(day) ||
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        Number.isNaN(second)
    ) {
        return 0;
    }

    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((asUtc - date.getTime()) / 60000);
}
