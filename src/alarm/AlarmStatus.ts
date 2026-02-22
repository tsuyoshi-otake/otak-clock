import { AlarmSettings } from './AlarmSettings';
import { I18nManager } from '../i18n/I18nManager';
import { formatLocalAlarmTime } from './localTime';

export interface AlarmStatusBarState {
    text: string;
    tooltip: string;
}

export function buildAlarmStatusBarState(
    alarms: AlarmSettings[],
    i18n: I18nManager,
    alarmTimeZone?: string
): AlarmStatusBarState {
    const now = new Date();

    if (alarms.length === 0) {
        return {
            text: '$(bell) $(add)',
            tooltip: [
                i18n.t('alarm.statusBar.noAlarmSet'),
                i18n.t('alarm.statusBar.clickToManage')
            ].join('\n')
        };
    }

    if (alarms.length === 1) {
        const alarm = alarms[0];
        const time = formatLocalAlarmTime(alarm.hour, alarm.minute, now, alarmTimeZone ?? alarm.timeZoneId);
        const text = alarm.enabled ? `$(bell) ${time}` : `$(bell-slash) ${time}`;

        const status = alarm.enabled ? i18n.t('alarm.status.enabled') : i18n.t('alarm.status.disabled');
        const lines: string[] = [
            i18n.t('alarm.statusBar.alarm', { time }),
            i18n.t('alarm.statusBar.status', { status })
        ];
        if (alarm.enabled && alarm.triggered) {
            lines.push(i18n.t('alarm.statusBar.triggeredToday'));
        }
        lines.push(i18n.t('alarm.statusBar.clickToManage'));

        return { text, tooltip: lines.join('\n') };
    }

    const displayAlarm = alarms.find((alarm) => alarm.enabled) ?? alarms[0];
    const icon = alarms.some((alarm) => alarm.enabled) ? '$(bell)' : '$(bell-slash)';
    const text = `${icon} ${formatLocalAlarmTime(displayAlarm.hour, displayAlarm.minute, now, alarmTimeZone ?? displayAlarm.timeZoneId)}`;

    const lines: string[] = alarms.map((alarm, index) => {
        const status = alarm.enabled ? i18n.t('alarm.status.enabled') : i18n.t('alarm.status.disabled');
        const fired = alarm.enabled && alarm.triggered ? i18n.t('alarm.status.firedTodaySuffix') : '';
        return `${index + 1}. ${formatLocalAlarmTime(alarm.hour, alarm.minute, now, alarmTimeZone ?? alarm.timeZoneId)} (${status})${fired}`;
    });
    lines.push(i18n.t('alarm.statusBar.clickToManage'));

    return { text, tooltip: lines.join('\n') };
}
