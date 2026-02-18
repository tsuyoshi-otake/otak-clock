import * as vscode from 'vscode';
import { isRecord } from '../utils/guards';
import {
    AlarmConfig,
    AlarmRuntime,
    AlarmSettings,
    formatTime,
    toAlarmConfig,
    toAlarmRuntime,
    validateAlarmConfig,
    validateAlarmRuntime,
    validateAlarmSettings
} from './AlarmSettings';
import { ALARM_CONFIG_KEY, ALARM_RUNTIME_KEY, LEGACY_ALARM_STATE_KEY, MAX_ALARMS } from './constants';

type RuntimeById = Record<string, AlarmRuntime>;

export function createAlarmId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeAlarmsForSave(alarms: AlarmSettings[]): AlarmSettings[] {
    const normalized: AlarmSettings[] = [];
    const seenIds = new Set<string>();

    for (const alarm of alarms.slice(0, MAX_ALARMS)) {
        let id = typeof alarm.id === 'string' && alarm.id.length > 0 ? alarm.id : '';
        while (!id || seenIds.has(id)) {
            id = createAlarmId();
        }
        seenIds.add(id);
        normalized.push({ ...alarm, id });
    }

    return normalized;
}

function parseConfigList(rawConfig: unknown): { configs: AlarmConfig[]; needsPersist: boolean } {
    const configs: AlarmConfig[] = [];
    let needsPersist = false;

    if (Array.isArray(rawConfig)) {
        for (const item of rawConfig) {
            const config = validateAlarmConfig(item);
            if (config) {
                configs.push(config);
            } else {
                needsPersist = true;
            }
        }
    } else {
        const config = validateAlarmConfig(rawConfig);
        if (config) {
            configs.push(config);
            needsPersist = true;
        } else if (rawConfig !== undefined) {
            needsPersist = true;
        }
    }

    if (configs.length > MAX_ALARMS) {
        return { configs: configs.slice(0, MAX_ALARMS), needsPersist: true };
    }

    return { configs, needsPersist };
}

function parseRuntimeMap(rawRuntime: unknown, alarmIds: string[]): { runtimeById: RuntimeById; needsPersist: boolean } {
    const runtimeById: RuntimeById = {};
    let needsPersist = false;

    if (Array.isArray(rawRuntime)) {
        for (let i = 0; i < rawRuntime.length && i < alarmIds.length; i += 1) {
            const runtime = validateAlarmRuntime(rawRuntime[i]);
            if (runtime) {
                runtimeById[alarmIds[i]] = runtime;
            } else {
                needsPersist = true;
            }
        }
        return { runtimeById, needsPersist: true };
    }

    if (!isRecord(rawRuntime)) {
        return { runtimeById, needsPersist: rawRuntime !== undefined };
    }

    const hasLegacySingleShape = 'triggered' in rawRuntime || 'lastTriggeredOn' in rawRuntime
        || 'timeSignature' in rawRuntime || 'snoozeUntilMs' in rawRuntime;
    if (hasLegacySingleShape) {
        const runtime = validateAlarmRuntime(rawRuntime);
        if (runtime && alarmIds.length > 0) {
            runtimeById[alarmIds[0]] = runtime;
        }
        return { runtimeById, needsPersist: true };
    }

    for (const [id, value] of Object.entries(rawRuntime)) {
        const runtime = validateAlarmRuntime(value);
        if (runtime) {
            runtimeById[id] = runtime;
        } else {
            needsPersist = true;
        }
    }

    return { runtimeById, needsPersist };
}

export function loadAlarmsFromGlobalState(context: vscode.ExtensionContext): AlarmSettings[] {
    let needsConfigPersist = false;
    let needsRuntimePersist = false;
    let needsLegacyCleanup = false;

    const rawConfig = context.globalState.get<unknown>(ALARM_CONFIG_KEY);
    const parsedConfig = parseConfigList(rawConfig);
    let configs = parsedConfig.configs;
    needsConfigPersist = parsedConfig.needsPersist;

    if (configs.length === 0) {
        const legacyRaw = context.globalState.get<unknown>(LEGACY_ALARM_STATE_KEY);
        const legacy = validateAlarmSettings(legacyRaw);
        if (legacy) {
            configs = [toAlarmConfig(legacy)];
            needsConfigPersist = true;
            needsRuntimePersist = true;
            needsLegacyCleanup = true;
        } else if (legacyRaw !== undefined) {
            needsLegacyCleanup = true;
        }
    } else if (context.globalState.get<unknown>(LEGACY_ALARM_STATE_KEY) !== undefined) {
        needsLegacyCleanup = true;
    }

    const seenIds = new Set<string>();
    const normalizedConfigs: AlarmConfig[] = [];
    for (const config of configs) {
        let id = typeof config.id === 'string' && config.id.length > 0 ? config.id : '';
        while (!id || seenIds.has(id)) {
            id = createAlarmId();
            needsConfigPersist = true;
        }
        seenIds.add(id);
        normalizedConfigs.push({ ...config, id });
    }

    const ids = normalizedConfigs
        .map((config) => config.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const rawRuntime = context.globalState.get<unknown>(ALARM_RUNTIME_KEY);
    const parsedRuntime = parseRuntimeMap(rawRuntime, ids);
    const runtimeById = parsedRuntime.runtimeById;
    needsRuntimePersist = needsRuntimePersist || parsedRuntime.needsPersist;
    if (ids.length === 0 && rawRuntime !== undefined) {
        needsRuntimePersist = true;
    }

    const alarms: AlarmSettings[] = [];
    const normalizedRuntimeById: RuntimeById = {};

    for (const config of normalizedConfigs) {
        if (!config.id) {
            continue;
        }

        const signature = formatTime(config.hour, config.minute);
        let runtime = runtimeById[config.id] ?? { triggered: false };

        if (runtime.timeSignature === undefined) {
            runtime = { ...runtime, timeSignature: signature };
            needsRuntimePersist = true;
        } else if (runtime.timeSignature !== signature) {
            runtime = { triggered: false, timeSignature: signature };
            needsRuntimePersist = true;
        }

        normalizedRuntimeById[config.id] = runtime;

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
        if (typeof runtime.snoozeUntilMs === 'number') {
            merged.snoozeUntilMs = runtime.snoozeUntilMs;
        }
        alarms.push(merged);
    }

    if (needsConfigPersist) {
        void context.globalState.update(
            ALARM_CONFIG_KEY,
            alarms.length > 0 ? alarms.map((alarm) => toAlarmConfig(alarm)) : undefined
        );
    }
    if (needsRuntimePersist) {
        void context.globalState.update(
            ALARM_RUNTIME_KEY,
            alarms.length > 0 ? normalizedRuntimeById : undefined
        );
    }
    if (needsLegacyCleanup) {
        void context.globalState.update(LEGACY_ALARM_STATE_KEY, undefined);
    }

    return alarms;
}

export function saveAlarmsToGlobalState(context: vscode.ExtensionContext, alarms: AlarmSettings[]): AlarmSettings[] {
    const normalized = normalizeAlarmsForSave(alarms);

    if (normalized.length === 0) {
        void context.globalState.update(ALARM_CONFIG_KEY, undefined);
        void context.globalState.update(ALARM_RUNTIME_KEY, undefined);
    } else {
        const configs: AlarmConfig[] = normalized.map((alarm) => toAlarmConfig(alarm));
        const runtimeById: RuntimeById = {};
        for (const alarm of normalized) {
            if (!alarm.id) {
                continue;
            }
            runtimeById[alarm.id] = toAlarmRuntime(alarm);
        }

        void context.globalState.update(ALARM_CONFIG_KEY, configs);
        void context.globalState.update(ALARM_RUNTIME_KEY, runtimeById);
    }

    void context.globalState.update(LEGACY_ALARM_STATE_KEY, undefined);
    return normalized;
}
