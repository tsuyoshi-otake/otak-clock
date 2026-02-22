import { getFormatters, getStatusBarTimeZoneLabel } from '../clock/formatters';
import { TimeZoneInfo } from '../timezone/types';
import { findTimeZoneById } from '../timezone/data';
import { formatTime } from './AlarmSettings';

const localTimeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const localTimeZoneInfo: TimeZoneInfo = {
    label: 'Local Time',
    timeZoneId: localTimeZoneId,
    region: 'Local',
    baseUtcOffset: 0
};

export function getLocalTimeZoneLabel(now: Date): string {
    return getStatusBarTimeZoneLabel(now, localTimeZoneInfo, getFormatters(localTimeZoneId));
}

export function formatLocalAlarmTime(hour: number, minute: number, now: Date = new Date(), alarmTimeZone?: string): string {
    if (alarmTimeZone) {
        const tzInfo = findTimeZoneById(alarmTimeZone) ?? { ...localTimeZoneInfo, timeZoneId: alarmTimeZone };
        return `${formatTime(hour, minute)} ${getStatusBarTimeZoneLabel(now, tzInfo, getFormatters(alarmTimeZone))}`;
    }
    return `${formatTime(hour, minute)} ${getLocalTimeZoneLabel(now)}`;
}
