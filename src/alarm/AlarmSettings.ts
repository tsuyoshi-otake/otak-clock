import { isRecord } from '../utils/guards';

export interface AlarmConfig {
    enabled: boolean;
    hour: number;
    minute: number;
}

export interface AlarmRuntime {
    triggered: boolean;
    /**
     * Local date key when the alarm last triggered (YYYY-MM-DD).
     * Used to reset `triggered` safely across restarts.
     */
    lastTriggeredOn?: string;
    /**
     * Signature of the alarm time this runtime corresponds to (HH:mm).
     * Used to reset runtime state when the alarm time changes (including via Settings Sync).
     */
    timeSignature?: string;
}

export type AlarmSettings = AlarmConfig & AlarmRuntime;

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

export function validateAlarmConfig(data: unknown): AlarmConfig | undefined {
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
        minute
    };
}

export function validateAlarmRuntime(data: unknown): AlarmRuntime | undefined {
    if (!isRecord(data)) {
        return undefined;
    }

    const runtime: AlarmRuntime = {
        triggered: typeof data.triggered === 'boolean' ? data.triggered : false
    };

    if (typeof data.lastTriggeredOn === 'string') {
        runtime.lastTriggeredOn = data.lastTriggeredOn;
    }

    if (typeof data.timeSignature === 'string') {
        runtime.timeSignature = data.timeSignature;
    }

    return runtime;
}

export function toAlarmConfig(alarm: AlarmSettings): AlarmConfig {
    return {
        enabled: alarm.enabled,
        hour: alarm.hour,
        minute: alarm.minute
    };
}

export function toAlarmRuntime(alarm: AlarmSettings): AlarmRuntime {
    const runtime: AlarmRuntime = {
        triggered: alarm.triggered,
        timeSignature: formatTime(alarm.hour, alarm.minute)
    };

    if (typeof alarm.lastTriggeredOn === 'string') {
        runtime.lastTriggeredOn = alarm.lastTriggeredOn;
    }

    return runtime;
}

/**
 * Legacy validation: older versions stored the entire alarm object (config + runtime)
 * under a single globalState key. Newer versions should store and validate config/runtime separately.
 */
export function validateAlarmSettings(data: unknown): AlarmSettings | undefined {
    const config = validateAlarmConfig(data);
    if (!config) {
        return undefined;
    }

    const runtime = validateAlarmRuntime(data) ?? { triggered: false };

    const merged: AlarmSettings = {
        ...config,
        triggered: runtime.triggered
    };
    if (typeof runtime.lastTriggeredOn === 'string') {
        merged.lastTriggeredOn = runtime.lastTriggeredOn;
    }
    if (typeof runtime.timeSignature === 'string') {
        merged.timeSignature = runtime.timeSignature;
    }

    return merged;
}

/** Regex for validating alarm time input (HH:MM, 24-hour). */
export const ALARM_TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
