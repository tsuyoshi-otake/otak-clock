import { TimeZoneInfo } from './types';
import { I18nManager } from '../i18n/I18nManager';

export const UTC_FALLBACK_TIMEZONE: TimeZoneInfo = {
    label: 'Coordinated Universal Time', timeZoneId: 'UTC', region: 'Universal Time', baseUtcOffset: 0
};

// タイムゾーンのリスト（IANAタイムゾーンIDを使用）
export const timeZones: TimeZoneInfo[] = [
    // Universal Time
    UTC_FALLBACK_TIMEZONE,
    { label: 'Greenwich Mean Time', timeZoneId: 'Etc/GMT', region: 'Universal Time', baseUtcOffset: 0 },

    // Americas
    { label: 'Alaska (Anchorage)', timeZoneId: 'America/Anchorage', region: 'Americas', baseUtcOffset: -9 },
    { label: 'US Pacific (Los Angeles)', timeZoneId: 'America/Los_Angeles', region: 'Americas', baseUtcOffset: -8 },
    { label: 'US Mountain (Denver)', timeZoneId: 'America/Denver', region: 'Americas', baseUtcOffset: -7 },
    { label: 'US Central (Chicago)', timeZoneId: 'America/Chicago', region: 'Americas', baseUtcOffset: -6 },
    { label: 'US Eastern (New York)', timeZoneId: 'America/New_York', region: 'Americas', baseUtcOffset: -5 },
    { label: 'Canada (Toronto)', timeZoneId: 'America/Toronto', region: 'Americas', baseUtcOffset: -5 },
    { label: 'Mexico (Mexico City)', timeZoneId: 'America/Mexico_City', region: 'Americas', baseUtcOffset: -6 },
    { label: 'Brazil (Sao Paulo)', timeZoneId: 'America/Sao_Paulo', region: 'Americas', baseUtcOffset: -3 },
    { label: 'Argentina (Buenos Aires)', timeZoneId: 'America/Argentina/Buenos_Aires', region: 'Americas', baseUtcOffset: -3 },

    // Europe
    { label: 'UK (London)', timeZoneId: 'Europe/London', region: 'Europe', baseUtcOffset: 0 },
    { label: 'France (Paris)', timeZoneId: 'Europe/Paris', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Germany (Berlin)', timeZoneId: 'Europe/Berlin', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Italy (Rome)', timeZoneId: 'Europe/Rome', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Spain (Madrid)', timeZoneId: 'Europe/Madrid', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Switzerland (Zurich)', timeZoneId: 'Europe/Zurich', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Russia (Moscow)', timeZoneId: 'Europe/Moscow', region: 'Europe', baseUtcOffset: 3 },

    // Africa & Middle East
    { label: 'Egypt (Cairo)', timeZoneId: 'Africa/Cairo', region: 'Africa & Middle East', baseUtcOffset: 2 },
    { label: 'Kenya (Nairobi)', timeZoneId: 'Africa/Nairobi', region: 'Africa & Middle East', baseUtcOffset: 3 },
    { label: 'Saudi Arabia (Riyadh)', timeZoneId: 'Asia/Riyadh', region: 'Africa & Middle East', baseUtcOffset: 3 },
    { label: 'UAE (Dubai)', timeZoneId: 'Asia/Dubai', region: 'Africa & Middle East', baseUtcOffset: 4 },
    { label: 'Iran (Tehran)', timeZoneId: 'Asia/Tehran', region: 'Africa & Middle East', baseUtcOffset: 3.5 },

    // Asia
    { label: 'India (New Delhi)', timeZoneId: 'Asia/Kolkata', region: 'Asia', baseUtcOffset: 5.5 },
    { label: 'Bangladesh (Dhaka)', timeZoneId: 'Asia/Dhaka', region: 'Asia', baseUtcOffset: 6 },
    { label: 'Thailand (Bangkok)', timeZoneId: 'Asia/Bangkok', region: 'Asia', baseUtcOffset: 7 },
    { label: 'Vietnam (Ho Chi Minh)', timeZoneId: 'Asia/Ho_Chi_Minh', region: 'Asia', baseUtcOffset: 7 },
    { label: 'Indonesia (Jakarta)', timeZoneId: 'Asia/Jakarta', region: 'Asia', baseUtcOffset: 7 },
    { label: 'Malaysia (Kuala Lumpur)', timeZoneId: 'Asia/Kuala_Lumpur', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Singapore', timeZoneId: 'Asia/Singapore', region: 'Asia', baseUtcOffset: 8 },
    { label: 'China (Beijing)', timeZoneId: 'Asia/Shanghai', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Hong Kong', timeZoneId: 'Asia/Hong_Kong', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Taiwan (Taipei)', timeZoneId: 'Asia/Taipei', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Philippines (Manila)', timeZoneId: 'Asia/Manila', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Korea (Seoul)', timeZoneId: 'Asia/Seoul', region: 'Asia', baseUtcOffset: 9 },
    { label: 'Japan (Tokyo)', timeZoneId: 'Asia/Tokyo', region: 'Asia', baseUtcOffset: 9 },

    // Oceania
    { label: 'Australia (Perth)', timeZoneId: 'Australia/Perth', region: 'Oceania', baseUtcOffset: 8 },
    { label: 'Australia (Adelaide)', timeZoneId: 'Australia/Adelaide', region: 'Oceania', baseUtcOffset: 9.5 },
    { label: 'Australia (Sydney)', timeZoneId: 'Australia/Sydney', region: 'Oceania', baseUtcOffset: 10 },
    { label: 'Australia (Melbourne)', timeZoneId: 'Australia/Melbourne', region: 'Oceania', baseUtcOffset: 10 },
    { label: 'Australia (Brisbane)', timeZoneId: 'Australia/Brisbane', region: 'Oceania', baseUtcOffset: 10 },
    { label: 'New Zealand (Auckland)', timeZoneId: 'Pacific/Auckland', region: 'Oceania', baseUtcOffset: 12 }
];

export const regionTranslationKeys: Record<string, string> = {
    'Universal Time': 'region.universal',
    'Americas': 'region.americas',
    'Europe': 'region.europe',
    'Africa & Middle East': 'region.africaMiddleEast',
    'Asia': 'region.asia',
    'Oceania': 'region.oceania'
};

export function localizeRegion(region: string, i18n: I18nManager): string {
    const key = regionTranslationKeys[region];
    return key ? i18n.t(key) : region;
}

export function findTimeZoneById(timeZoneId: string): TimeZoneInfo | undefined {
    return timeZones.find(tz => tz.timeZoneId === timeZoneId);
}
