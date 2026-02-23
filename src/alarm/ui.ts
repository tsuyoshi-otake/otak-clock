import * as vscode from 'vscode';
import { ALARM_TIME_REGEX, AlarmSettings } from './AlarmSettings';
import { I18nManager } from '../i18n/I18nManager';
import { formatLocalAlarmTime } from './localTime';

type AlarmPickItem = vscode.QuickPickItem & { alarmId: string };
type AlarmMenuAction = 'set' | 'toggle' | 'edit' | 'delete';
type AlarmMenuItem = vscode.QuickPickItem & { action: AlarmMenuAction; alarmId?: string };

export interface AlarmMenuSelection {
    action: AlarmMenuAction;
    alarmId?: string;
}

export async function promptForAlarmTime(
    i18n: I18nManager,
    initialValue?: string
): Promise<{ hour: number; minute: number } | undefined> {
    const timeInput = await vscode.window.showInputBox({
        prompt: i18n.t('alarm.input.prompt'),
        placeHolder: i18n.t('alarm.input.placeholder'),
        value: initialValue,
        validateInput: (value) => ALARM_TIME_REGEX.test(value) ? null : i18n.t('alarm.input.invalidFormat')
    });

    if (!timeInput) {
        return undefined;
    }

    const [hour, minute] = timeInput.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return undefined;
    }

    return { hour, minute };
}

export async function pickAlarmId(
    alarms: AlarmSettings[],
    i18n: I18nManager,
    placeHolder: string,
    alarmTimeZone?: string
): Promise<string | undefined> {
    if (alarms.length === 0) {
        return undefined;
    }

    if (alarms.length === 1) {
        return alarms[0].id;
    }

    const now = new Date();
    const items: AlarmPickItem[] = alarms
        .filter((alarm): alarm is AlarmSettings & { id: string } => typeof alarm.id === 'string' && alarm.id.length > 0)
        .map((alarm, index) => {
            const status = alarm.enabled ? i18n.t('alarm.status.enabled') : i18n.t('alarm.status.disabled');
            const fired = alarm.enabled && alarm.triggered ? i18n.t('alarm.status.firedTodaySuffix') : '';
            return {
                label: `${index + 1}. ${formatLocalAlarmTime(alarm.hour, alarm.minute, now, alarmTimeZone)}`,
                description: `${status}${fired}`,
                alarmId: alarm.id
            };
        });

    const picked = await vscode.window.showQuickPick(items, { placeHolder });
    return picked?.alarmId;
}

export async function showAlarmMenuQuickPick(
    alarms: AlarmSettings[],
    i18n: I18nManager,
    maxAlarms: number,
    alarmTimeZone?: string
): Promise<AlarmMenuSelection | undefined> {
    const now = new Date();
    const items: AlarmMenuItem[] = [];

    if (alarms.length < maxAlarms) {
        items.push({
            label: i18n.t('alarm.menu.setSlot', { slot: String(alarms.length + 1) }),
            description: `${alarms.length}/${maxAlarms}`,
            action: 'set'
        });
    }

    for (let i = 0; i < alarms.length; i += 1) {
        const alarm = alarms[i];
        if (!alarm.id) {
            continue;
        }

        const slot = String(i + 1);
        const time = formatLocalAlarmTime(alarm.hour, alarm.minute, now, alarmTimeZone);
        const status = alarm.enabled ? i18n.t('alarm.status.enabled') : i18n.t('alarm.status.disabled');
        const fired = alarm.enabled && alarm.triggered ? i18n.t('alarm.status.firedTodaySuffix') : '';
        const description = `${time} (${status})${fired}`;

        items.push({
            label: alarm.enabled ? i18n.t('alarm.menu.disableSlot', { slot }) : i18n.t('alarm.menu.enableSlot', { slot }),
            description,
            action: 'toggle',
            alarmId: alarm.id
        });
        items.push({ label: i18n.t('alarm.menu.editSlot', { slot }), description, action: 'edit', alarmId: alarm.id });
        items.push({ label: i18n.t('alarm.menu.deleteSlot', { slot }), description, action: 'delete', alarmId: alarm.id });
    }

    const picked = await vscode.window.showQuickPick(items, { placeHolder: `${alarms.length}/${maxAlarms}` });
    if (!picked) {
        return undefined;
    }

    return { action: picked.action, alarmId: picked.alarmId };
}
