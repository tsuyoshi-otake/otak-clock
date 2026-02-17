import * as vscode from 'vscode';
import { TimeZoneInfo } from './types';
import { timeZones, localizeRegion } from './data';
import { formatUtcOffsetLabel, getUtcOffsetMinutes } from './offsets';
import { I18nManager } from '../i18n/I18nManager';

export interface TimeZonePickerItem {
    label: string;
    description: string;
    detail: string;
}

export function buildTimeZonePickerItem(
    tz: TimeZoneInfo, now: Date, i18n: I18nManager
): TimeZonePickerItem {
    const baseOffsetMinutes = Math.round(tz.baseUtcOffset * 60);
    let offsetMinutes = getUtcOffsetMinutes(now, tz.timeZoneId);
    if (offsetMinutes === 0 && baseOffsetMinutes !== 0) {
        offsetMinutes = baseOffsetMinutes;
    }
    const dstSuffix = offsetMinutes !== baseOffsetMinutes ? i18n.t('clock.dstSuffix') : '';
    return {
        label: tz.label,
        description: `(${formatUtcOffsetLabel(offsetMinutes)}${dstSuffix})`,
        detail: tz.timeZoneId
    };
}

export function compareRegions(a: string, b: string, i18n: I18nManager): number {
    if (a === 'Universal Time') {
        return -1;
    }
    if (b === 'Universal Time') {
        return 1;
    }
    return localizeRegion(a, i18n).localeCompare(localizeRegion(b, i18n));
}

export async function selectTimeZoneWithRegion(): Promise<TimeZoneInfo | undefined> {
    const i18n = I18nManager.getInstance();

    // まず地域を選択
    const regions = [...new Set(timeZones.map(tz => tz.region))].sort((a, b) => compareRegions(a, b, i18n));

    type RegionPickItem = vscode.QuickPickItem & { region: string };

    const regionItems: RegionPickItem[] = regions.map(region => {
        const localized = localizeRegion(region, i18n);
        return {
            label: localized,
            description: localized !== region ? region : undefined,
            region
        };
    });

    const selectedRegion = await vscode.window.showQuickPick(regionItems, {
        placeHolder: i18n.t('prompt.selectRegion'),
        matchOnDescription: true
    });

    if (!selectedRegion) {
        return undefined;
    }

    // 選択された地域のタイムゾーンを表示
    const now = new Date();
    const timeZonesInRegion = timeZones.filter(tz => tz.region === selectedRegion.region);
    const selectedLabel = await vscode.window.showQuickPick(
        timeZonesInRegion.map(tz => buildTimeZonePickerItem(tz, now, i18n)),
        {
            placeHolder: i18n.t('prompt.selectTimeZone'),
            matchOnDescription: true,
            matchOnDetail: true
        }
    );

    if (!selectedLabel) {
        return undefined;
    }

    return timeZones.find(tz => tz.timeZoneId === selectedLabel.detail);
}
