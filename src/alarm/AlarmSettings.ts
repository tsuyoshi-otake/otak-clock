import { isRecord } from '../utils/guards';

export interface AlarmConfig {
    id?: string;
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
    /**
     * Epoch milliseconds until which the alarm is snoozed.
     */
    snoozeUntilMs?: number;
    /**
     * Local date key (YYYY-MM-DD) when the user manually dismissed this alarm.
     * Written to globalState when Stop is pressed so other VS Code windows can
     * detect the dismissal and stop their own notification sessions.
     */
    dismissedOn?: string;
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

    const id = data.id;
    const enabled = data.enabled;
    const hour = data.hour;
    const minute = data.minute;

    if (id !== undefined && typeof id !== 'string') { return undefined; }
    if (typeof enabled !== 'boolean') { return undefined; }
    if (!isIntInRange(hour, 0, 23)) { return undefined; }
    if (!isIntInRange(minute, 0, 59)) { return undefined; }

    const config: AlarmConfig = {
        enabled,
        hour,
        minute
    };
    if (typeof id === 'string' && id.length > 0) {
        config.id = id;
    }
    return config;
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

    if (typeof data.snoozeUntilMs === 'number' && Number.isFinite(data.snoozeUntilMs) && data.snoozeUntilMs > 0) {
        runtime.snoozeUntilMs = data.snoozeUntilMs;
    }

    if (typeof data.dismissedOn === 'string') {
        runtime.dismissedOn = data.dismissedOn;
    }

    return runtime;
}

export function toAlarmConfig(alarm: AlarmSettings): AlarmConfig {
    const config: AlarmConfig = {
        enabled: alarm.enabled,
        hour: alarm.hour,
        minute: alarm.minute
    };
    if (typeof alarm.id === 'string' && alarm.id.length > 0) {
        config.id = alarm.id;
    }
    return config;
}

export function toAlarmRuntime(alarm: AlarmSettings): AlarmRuntime {
    const runtime: AlarmRuntime = {
        triggered: alarm.triggered,
        timeSignature: formatTime(alarm.hour, alarm.minute)
    };

    if (typeof alarm.lastTriggeredOn === 'string') {
        runtime.lastTriggeredOn = alarm.lastTriggeredOn;
    }
    if (typeof alarm.snoozeUntilMs === 'number' && Number.isFinite(alarm.snoozeUntilMs) && alarm.snoozeUntilMs > 0) {
        runtime.snoozeUntilMs = alarm.snoozeUntilMs;
    }

    if (typeof alarm.dismissedOn === 'string') {
        runtime.dismissedOn = alarm.dismissedOn;
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
    if (typeof runtime.snoozeUntilMs === 'number' && Number.isFinite(runtime.snoozeUntilMs) && runtime.snoozeUntilMs > 0) {
        merged.snoozeUntilMs = runtime.snoozeUntilMs;
    }

    if (typeof runtime.dismissedOn === 'string') {
        merged.dismissedOn = runtime.dismissedOn;
    }

    return merged;
}

/** Regex for validating alarm time input (HH:MM, 24-hour). */
export const ALARM_TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
