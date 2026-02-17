import { isRecord } from '../utils/guards';

export interface AlarmSettings {
    enabled: boolean;
    hour: number;
    minute: number;
    triggered: boolean;
    /**
     * Local date key when the alarm last triggered (YYYY-MM-DD).
     * Used to reset `triggered` safely across restarts.
     */
    lastTriggeredOn?: string;
}

export function createDefaultAlarm(): AlarmSettings {
    return {
        enabled: true,
        hour: 9,
        minute: 0,
        triggered: false
    };
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function validateAlarmSettings(data: unknown): AlarmSettings | undefined {
    if (!isRecord(data)) { return undefined; }

    const enabled = data.enabled;
    const hour = data.hour;
    const minute = data.minute;

    if (typeof enabled !== 'boolean') { return undefined; }
    if (!isIntInRange(hour, 0, 23)) { return undefined; }
    if (!isIntInRange(minute, 0, 59)) { return undefined; }

    return {
        enabled,
        hour,
        minute,
        triggered: typeof data.triggered === 'boolean' ? data.triggered : false,
        lastTriggeredOn: typeof data.lastTriggeredOn === 'string' ? data.lastTriggeredOn : undefined
    };
}

/** Regex for validating alarm time input (HH:MM, 24-hour). */
export const ALARM_TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
