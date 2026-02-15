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

export function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
