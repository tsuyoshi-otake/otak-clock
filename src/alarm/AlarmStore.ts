import * as vscode from 'vscode';
import { AlarmSettings } from './AlarmSettings';
import { loadAlarmsFromGlobalState, saveAlarmsToGlobalState } from './storage';
import { sameAlarms } from './stateUtils';

/**
 * Single source of truth for the alarm list plus its globalState persistence.
 * Owns load / normalize / change-detection so AlarmManager can focus on
 * use-case orchestration (notifications, status bar, command flows).
 */
export class AlarmStore {
    private alarms: AlarmSettings[];

    constructor(private readonly context: vscode.ExtensionContext) {
        this.alarms = loadAlarmsFromGlobalState(context);
    }

    /** Current in-memory alarm list (the live array; callers must not mutate it in place). */
    getAll(): AlarmSettings[] {
        return this.alarms;
    }

    getById(alarmId: string): AlarmSettings | undefined {
        return this.alarms.find((alarm) => alarm.id === alarmId);
    }

    /** Reloads from globalState. Returns true only when the alarm set actually changed. */
    refresh(): boolean {
        const next = loadAlarmsFromGlobalState(this.context);
        if (sameAlarms(this.alarms, next)) {
            return false;
        }
        this.alarms = next;
        return true;
    }

    /** Normalizes + persists the given alarms, updates in-memory state, returns the normalized list. */
    save(alarms: AlarmSettings[]): AlarmSettings[] {
        const normalized = saveAlarmsToGlobalState(this.context, alarms);
        this.alarms = normalized;
        return normalized;
    }
}
