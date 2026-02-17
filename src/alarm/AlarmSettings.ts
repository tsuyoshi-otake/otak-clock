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

export function validateAlarmSettings(data: unknown): AlarmSettings | undefined {
    if (!data || typeof data !== 'object') { return undefined; }
    const obj = data as Record<string, unknown>;
    if (typeof obj.enabled !== 'boolean') { return undefined; }
    if (typeof obj.hour !== 'number' || obj.hour < 0 || obj.hour > 23 || !Number.isInteger(obj.hour)) { return undefined; }
    if (typeof obj.minute !== 'number' || obj.minute < 0 || obj.minute > 59 || !Number.isInteger(obj.minute)) { return undefined; }
    return {
        enabled: obj.enabled,
        hour: obj.hour,
        minute: obj.minute,
        triggered: typeof obj.triggered === 'boolean' ? obj.triggered : false,
        lastTriggeredOn: typeof obj.lastTriggeredOn === 'string' ? obj.lastTriggeredOn : undefined
    };
}

/** Regex for validating alarm time input (HH:MM, 24-hour). */
export const ALARM_TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
