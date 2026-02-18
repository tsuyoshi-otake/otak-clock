import { getFormatters, getStatusBarTimeZoneLabel } from '../clock/formatters';
import { TimeZoneInfo } from '../timezone/types';
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

export function formatLocalAlarmTime(hour: number, minute: number, now: Date = new Date()): string {
    return `${formatTime(hour, minute)} ${getLocalTimeZoneLabel(now)}`;
}
