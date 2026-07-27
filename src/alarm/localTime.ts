import { getTimeZoneShortLabelAt } from '../timezone/formatters';
import { formatTime } from './AlarmSettings';

const localTimeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function getLocalTimeZoneLabel(now: Date): string {
    return getTimeZoneShortLabelAt(localTimeZoneId, now.getTime());
}

export function formatLocalAlarmTime(hour: number, minute: number, now: Date = new Date(), alarmTimeZone?: string): string {
    const timeZoneId = alarmTimeZone ?? localTimeZoneId;
    return `${formatTime(hour, minute)} ${getTimeZoneShortLabelAt(timeZoneId, now.getTime())}`;
}
