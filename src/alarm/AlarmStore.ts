import * as vscode from 'vscode';
import { AlarmSettings } from './AlarmSettings';
import {
    AlarmStateSnapshot,
    isSameAlarmStateSnapshot,
    loadAlarmsFromGlobalState,
    readAlarmStateSnapshot,
    saveAlarmsToGlobalState
} from './storage';
import { sameAlarms } from './stateUtils';

/**
 * Single source of truth for the alarm list plus its globalState persistence.
 * Owns load / normalize / change-detection so AlarmManager can focus on
 * use-case orchestration (notifications, status bar, command flows).
 */
export class AlarmStore {
    private alarms: AlarmSettings[];
    /** Raw globalState values the current `alarms` array was built from. */
    private snapshot: AlarmStateSnapshot;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.alarms = loadAlarmsFromGlobalState(context);
        this.snapshot = readAlarmStateSnapshot(context);
    }

    /** Current in-memory alarm list (the live array; callers must not mutate it in place). */
    getAll(): AlarmSettings[] {
        return this.alarms;
    }

    getById(alarmId: string): AlarmSettings | undefined {
        return this.alarms.find((alarm) => alarm.id === alarmId);
    }

    /**
     * Reloads from globalState. Returns true only when the alarm set actually changed.
     *
     * This runs on every minute tick in every window, and the overwhelming majority of those
     * ticks see untouched globalState. Comparing the raw stored values first settles that case
     * without parsing, validating and rebuilding the whole alarm list.
     */
    refresh(): boolean {
        const snapshot = readAlarmStateSnapshot(this.context);
        if (isSameAlarmStateSnapshot(this.snapshot, snapshot)) {
            return false;
        }

        const next = loadAlarmsFromGlobalState(this.context);
        // Re-read after the load: loadAlarmsFromGlobalState() persists normalization fixes, so
        // capturing the pre-load snapshot would leave a difference that never resolves.
        this.snapshot = readAlarmStateSnapshot(this.context);

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
        this.snapshot = readAlarmStateSnapshot(this.context);
        return normalized;
    }
}
