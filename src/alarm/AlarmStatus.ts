import { AlarmSettings, formatTime } from './AlarmSettings';
import { I18nManager } from '../i18n/I18nManager';

export interface AlarmStatusBarState {
    text: string;
    tooltip: string;
}

export function buildAlarmStatusBarState(
    alarm: AlarmSettings | undefined,
    i18n: I18nManager
): AlarmStatusBarState {
    if (!alarm) {
        return {
            text: '$(bell) $(add)',
            tooltip: [
                i18n.t('alarm.statusBar.noAlarmSet'),
                i18n.t('alarm.statusBar.clickToManage')
            ].join('\n')
        };
    }

    const time = formatTime(alarm.hour, alarm.minute);
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
