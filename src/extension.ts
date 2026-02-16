// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { AlarmManager } from './alarm/AlarmManager';
import { I18nManager } from './i18n/I18nManager';

interface TimeZoneInfo {
    label: string;
    timeZoneId: string; // IANA timezone ID
    region: string;
    baseUtcOffset: number;
}

// タイムゾーンのリスト（IANAタイムゾーンIDを使用）
const timeZones: TimeZoneInfo[] = [
    // Universal Time
    { label: 'Coordinated Universal Time', timeZoneId: 'UTC', region: 'Universal Time', baseUtcOffset: 0 },
    { label: 'Greenwich Mean Time', timeZoneId: 'Etc/GMT', region: 'Universal Time', baseUtcOffset: 0 },
    
    // Americas
    { label: 'Alaska (Anchorage)', timeZoneId: 'America/Anchorage', region: 'Americas', baseUtcOffset: -9 },
    { label: 'US Pacific (Los Angeles)', timeZoneId: 'America/Los_Angeles', region: 'Americas', baseUtcOffset: -8 },
    { label: 'US Mountain (Denver)', timeZoneId: 'America/Denver', region: 'Americas', baseUtcOffset: -7 },
    { label: 'US Central (Chicago)', timeZoneId: 'America/Chicago', region: 'Americas', baseUtcOffset: -6 },
    { label: 'US Eastern (New York)', timeZoneId: 'America/New_York', region: 'Americas', baseUtcOffset: -5 },
    { label: 'Canada (Toronto)', timeZoneId: 'America/Toronto', region: 'Americas', baseUtcOffset: -5 },
    { label: 'Mexico (Mexico City)', timeZoneId: 'America/Mexico_City', region: 'Americas', baseUtcOffset: -6 },
    { label: 'Brazil (Sao Paulo)', timeZoneId: 'America/Sao_Paulo', region: 'Americas', baseUtcOffset: -3 },
    { label: 'Argentina (Buenos Aires)', timeZoneId: 'America/Argentina/Buenos_Aires', region: 'Americas', baseUtcOffset: -3 },

    // Europe
    { label: 'UK (London)', timeZoneId: 'Europe/London', region: 'Europe', baseUtcOffset: 0 },
    { label: 'France (Paris)', timeZoneId: 'Europe/Paris', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Germany (Berlin)', timeZoneId: 'Europe/Berlin', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Italy (Rome)', timeZoneId: 'Europe/Rome', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Spain (Madrid)', timeZoneId: 'Europe/Madrid', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Switzerland (Zurich)', timeZoneId: 'Europe/Zurich', region: 'Europe', baseUtcOffset: 1 },
    { label: 'Russia (Moscow)', timeZoneId: 'Europe/Moscow', region: 'Europe', baseUtcOffset: 3 },

    // Africa & Middle East
    { label: 'Egypt (Cairo)', timeZoneId: 'Africa/Cairo', region: 'Africa & Middle East', baseUtcOffset: 2 },
    { label: 'Kenya (Nairobi)', timeZoneId: 'Africa/Nairobi', region: 'Africa & Middle East', baseUtcOffset: 3 },
    { label: 'Saudi Arabia (Riyadh)', timeZoneId: 'Asia/Riyadh', region: 'Africa & Middle East', baseUtcOffset: 3 },
    { label: 'UAE (Dubai)', timeZoneId: 'Asia/Dubai', region: 'Africa & Middle East', baseUtcOffset: 4 },
    { label: 'Iran (Tehran)', timeZoneId: 'Asia/Tehran', region: 'Africa & Middle East', baseUtcOffset: 3.5 },

    // Asia
    { label: 'India (New Delhi)', timeZoneId: 'Asia/Kolkata', region: 'Asia', baseUtcOffset: 5.5 },
    { label: 'Bangladesh (Dhaka)', timeZoneId: 'Asia/Dhaka', region: 'Asia', baseUtcOffset: 6 },
    { label: 'Thailand (Bangkok)', timeZoneId: 'Asia/Bangkok', region: 'Asia', baseUtcOffset: 7 },
    { label: 'Vietnam (Ho Chi Minh)', timeZoneId: 'Asia/Ho_Chi_Minh', region: 'Asia', baseUtcOffset: 7 },
    { label: 'Indonesia (Jakarta)', timeZoneId: 'Asia/Jakarta', region: 'Asia', baseUtcOffset: 7 },
    { label: 'Malaysia (Kuala Lumpur)', timeZoneId: 'Asia/Kuala_Lumpur', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Singapore', timeZoneId: 'Asia/Singapore', region: 'Asia', baseUtcOffset: 8 },
    { label: 'China (Beijing)', timeZoneId: 'Asia/Shanghai', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Hong Kong', timeZoneId: 'Asia/Hong_Kong', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Taiwan (Taipei)', timeZoneId: 'Asia/Taipei', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Philippines (Manila)', timeZoneId: 'Asia/Manila', region: 'Asia', baseUtcOffset: 8 },
    { label: 'Korea (Seoul)', timeZoneId: 'Asia/Seoul', region: 'Asia', baseUtcOffset: 9 },
    { label: 'Japan (Tokyo)', timeZoneId: 'Asia/Tokyo', region: 'Asia', baseUtcOffset: 9 },

    // Oceania
    { label: 'Australia (Perth)', timeZoneId: 'Australia/Perth', region: 'Oceania', baseUtcOffset: 8 },
    { label: 'Australia (Adelaide)', timeZoneId: 'Australia/Adelaide', region: 'Oceania', baseUtcOffset: 9.5 },
    { label: 'Australia (Sydney)', timeZoneId: 'Australia/Sydney', region: 'Oceania', baseUtcOffset: 10 },
    { label: 'Australia (Melbourne)', timeZoneId: 'Australia/Melbourne', region: 'Oceania', baseUtcOffset: 10 },
    { label: 'Australia (Brisbane)', timeZoneId: 'Australia/Brisbane', region: 'Oceania', baseUtcOffset: 10 },
    { label: 'New Zealand (Auckland)', timeZoneId: 'Pacific/Auckland', region: 'Oceania', baseUtcOffset: 12 }
];

const regionTranslationKeys: Record<string, string> = {
    'Universal Time': 'region.universal',
    'Americas': 'region.americas',
    'Europe': 'region.europe',
    'Africa & Middle East': 'region.africaMiddleEast',
    'Asia': 'region.asia',
    'Oceania': 'region.oceania'
};

function localizeRegion(region: string, i18n: I18nManager): string {
    const key = regionTranslationKeys[region];
    return key ? i18n.t(key) : region;
}

type FormatterPair = {
    timeWithSeconds: Intl.DateTimeFormat;
    timeNoSeconds: Intl.DateTimeFormat;
    date: Intl.DateTimeFormat;
    timeZoneName: Intl.DateTimeFormat;
};

const TIME_ZONE_1_KEY = 'timeZone1';
const TIME_ZONE_2_KEY = 'timeZone2';
const DEFAULT_TIME_ZONE_1_ID = 'UTC';
const DEFAULT_TIME_ZONE_2_ID = 'Asia/Tokyo';
const SHOW_TIME_ZONE_IN_STATUS_BAR_SETTING = 'otak-clock.showTimeZoneInStatusBar';

function readShowTimeZoneInStatusBar(): boolean {
    return vscode.workspace.getConfiguration('otak-clock').get<boolean>('showTimeZoneInStatusBar', true);
}

function coerceTimeZoneId(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const v = value as { timeZoneId?: unknown };
    return typeof v.timeZoneId === 'string' ? v.timeZoneId : undefined;
}

function findTimeZoneById(timeZoneId: string): TimeZoneInfo | undefined {
    return timeZones.find(tz => tz.timeZoneId === timeZoneId);
}

function formatUtcOffsetLabel(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const totalMinutes = Math.abs(offsetMinutes);
    const hh = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const mm = (totalMinutes % 60).toString().padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
}

const offsetPartsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getOffsetPartsFormatter(timeZoneId: string): Intl.DateTimeFormat {
    const cached = offsetPartsFormatterCache.get(timeZoneId);
    if (cached) {
        return cached;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZoneId,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        hourCycle: 'h23'
    });

    // Guardrail to prevent unbounded growth if a user cycles through many time zones.
    if (offsetPartsFormatterCache.size >= 32) {
        offsetPartsFormatterCache.clear();
    }

    offsetPartsFormatterCache.set(timeZoneId, formatter);
    return formatter;
}

function getUtcOffsetMinutes(date: Date, timeZoneId: string): number {
    const parts = getOffsetPartsFormatter(timeZoneId).formatToParts(date);
    const values = Object.fromEntries(parts.map(p => [p.type, p.value]));

    const year = Number(values.year);
    const month = Number(values.month);
    const day = Number(values.day);
    const hour = Number(values.hour);
    const minute = Number(values.minute);
    const second = Number(values.second);

    if (
        Number.isNaN(year) ||
        Number.isNaN(month) ||
        Number.isNaN(day) ||
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        Number.isNaN(second)
    ) {
        return 0;
    }

    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((asUtc - date.getTime()) / 60000);
}

function msUntilNextSecond(nowMs: number): number {
    const remainder = nowMs % 1000;
    return remainder === 0 ? 1000 : 1000 - remainder;
}

function msUntilNextMinute(nowMs: number): number {
    const remainder = nowMs % 60000;
    return remainder === 0 ? 60000 : 60000 - remainder;
}

class ClockController implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private statusBar1: vscode.StatusBarItem;
    private statusBar2: vscode.StatusBarItem;
    private alarmManager: AlarmManager;
    private i18n: I18nManager;

    private timeZone1: TimeZoneInfo;
    private timeZone2: TimeZoneInfo;

    private formatterCache = new Map<string, FormatterPair>();

    private lastTime1: string | undefined;
    private lastTime2: string | undefined;
    private lastTooltip1: string | undefined;
    private lastTooltip2: string | undefined;

    private focused: boolean;
    private lastMinuteBucket: number | undefined;
    private tickHandle: NodeJS.Timeout | undefined;
    private windowStateDisposable: vscode.Disposable;
    private configurationDisposable: vscode.Disposable;
    private showTimeZoneInStatusBar: boolean;
    private disposed: boolean = false;

    constructor(
        context: vscode.ExtensionContext,
        statusBar1: vscode.StatusBarItem,
        statusBar2: vscode.StatusBarItem,
        alarmManager: AlarmManager
    ) {
        this.context = context;
        this.statusBar1 = statusBar1;
        this.statusBar2 = statusBar2;
        this.alarmManager = alarmManager;
        this.i18n = I18nManager.getInstance();

        this.focused = vscode.window.state.focused;

        const loaded1 = this.loadTimeZone(TIME_ZONE_1_KEY, DEFAULT_TIME_ZONE_1_ID);
        this.timeZone1 = loaded1.timeZone;
        if (loaded1.needsPersist) {
            void this.context.globalState.update(TIME_ZONE_1_KEY, this.timeZone1);
        }

        const loaded2 = this.loadTimeZone(TIME_ZONE_2_KEY, DEFAULT_TIME_ZONE_2_ID);
        this.timeZone2 = loaded2.timeZone;
        if (loaded2.needsPersist) {
            void this.context.globalState.update(TIME_ZONE_2_KEY, this.timeZone2);
        }

        this.showTimeZoneInStatusBar = readShowTimeZoneInStatusBar();
        this.configurationDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (!e.affectsConfiguration(SHOW_TIME_ZONE_IN_STATUS_BAR_SETTING)) {
                return;
            }

            const next = readShowTimeZoneInStatusBar();
            if (next === this.showTimeZoneInStatusBar) {
                return;
            }

            this.showTimeZoneInStatusBar = next;
            this.refresh(true);
        });

        this.windowStateDisposable = vscode.window.onDidChangeWindowState((e) => {
            const wasFocused = this.focused;
            this.focused = e.focused;

            const now = new Date();
            this.runMinuteTick(now, false);
            // Switch between HH:mm:ss (focused) and HH:mm (unfocused) immediately.
            this.updateClockText(now, true);

            if (this.focused && !wasFocused) {
                this.updateTooltips(now, true);
            }

            this.scheduleNextTick(true);
        });

        this.refresh(true);
        this.scheduleNextTick(true);
    }

    setTimeZone1(timeZone: TimeZoneInfo): void {
        if (timeZone.timeZoneId === this.timeZone1.timeZoneId) {
            return;
        }

        this.timeZone1 = timeZone;
        void this.context.globalState.update(TIME_ZONE_1_KEY, timeZone);
        this.refresh(true);
    }

    setTimeZone2(timeZone: TimeZoneInfo): void {
        if (timeZone.timeZoneId === this.timeZone2.timeZoneId) {
            return;
        }

        this.timeZone2 = timeZone;
        void this.context.globalState.update(TIME_ZONE_2_KEY, timeZone);
        this.refresh(true);
    }

    swapTimeZones(): void {
        const tmp = this.timeZone1;
        this.timeZone1 = this.timeZone2;
        this.timeZone2 = tmp;

        void this.context.globalState.update(TIME_ZONE_1_KEY, this.timeZone1);
        void this.context.globalState.update(TIME_ZONE_2_KEY, this.timeZone2);
        this.refresh(true);
    }

    private loadTimeZone(key: string, fallbackId: string): { timeZone: TimeZoneInfo; needsPersist: boolean } {
        const fallback = findTimeZoneById(fallbackId) ?? timeZones[0];

        const stored = this.context.globalState.get<unknown>(key);
        const storedId = coerceTimeZoneId(stored);
        if (!storedId) {
            return { timeZone: fallback, needsPersist: true };
        }

        const timeZone = findTimeZoneById(storedId);
        if (!timeZone) {
            return { timeZone: fallback, needsPersist: true };
        }

        // Validate that the runtime supports the IANA timeZoneId.
        try {
            void this.getFormatters(timeZone.timeZoneId);
        } catch {
            return { timeZone: fallback, needsPersist: true };
        }

        return { timeZone, needsPersist: false };
    }

    private getFormatters(timeZoneId: string): FormatterPair {
        const cached = this.formatterCache.get(timeZoneId);
        if (cached) {
            return cached;
        }

        const formatters: FormatterPair = {
            timeWithSeconds: new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: timeZoneId
            }),
            timeNoSeconds: new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: timeZoneId
            }),
            date: new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: timeZoneId
            }),
            timeZoneName: new Intl.DateTimeFormat('en-US', {
                timeZone: timeZoneId,
                timeZoneName: 'short'
            })
        };

        // Guardrail to prevent unbounded growth if a user cycles through many time zones.
        if (this.formatterCache.size >= 32) {
            this.formatterCache.clear();
        }

        this.formatterCache.set(timeZoneId, formatters);
        return formatters;
    }

    private getStatusBarTimeZoneLabel(now: Date, timeZone: TimeZoneInfo, formatters: FormatterPair): string {
        // Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }) returns "GMT+9" for Asia/Tokyo,
        // but Japanese developers commonly expect "JST" for quick scanning in the status bar.
        if (timeZone.timeZoneId === 'Asia/Tokyo') {
            return 'JST';
        }

        const tzPart = formatters.timeZoneName.formatToParts(now).find(p => p.type === 'timeZoneName')?.value;
        if (!tzPart) {
            return timeZone.timeZoneId;
        }

        // Normalize "GMT+X" to "UTC+X" for consistency with other UI strings in this extension.
        if (tzPart.startsWith('GMT')) {
            return `UTC${tzPart.slice(3)}`;
        }

        return tzPart;
    }

    private refresh(forceTooltips: boolean): void {
        const now = new Date();
        this.updateClockText(now, true);
        this.runMinuteTick(now, true);
        this.updateTooltips(now, forceTooltips);
    }

    private onTick(): void {
        this.tickHandle = undefined;
        if (this.disposed) {
            return;
        }

        const now = new Date();
        this.runMinuteTick(now, false);
        this.updateClockText(now, false);

        this.scheduleNextTick(false);
    }

    private runMinuteTick(now: Date, force: boolean): void {
        const minuteBucket = Math.floor(now.getTime() / 60000);
        if (!force && this.lastMinuteBucket === minuteBucket) {
            return;
        }
        this.lastMinuteBucket = minuteBucket;

        // Alarm logic runs even when the VS Code window is not focused.
        this.alarmManager.tick(now);

        if (this.focused) {
            this.updateTooltips(now, false);
        }
    }

    private updateClockText(now: Date, force: boolean): void {
        const formatters1 = this.getFormatters(this.timeZone1.timeZoneId);
        const time1 = (this.focused ? formatters1.timeWithSeconds : formatters1.timeNoSeconds).format(now);
        const text1 = this.showTimeZoneInStatusBar
            ? `${time1} ${this.getStatusBarTimeZoneLabel(now, this.timeZone1, formatters1)}`
            : time1;
        if (force || text1 !== this.lastTime1) {
            this.statusBar1.text = text1;
            this.lastTime1 = text1;
        }

        const formatters2 = this.getFormatters(this.timeZone2.timeZoneId);
        const time2 = (this.focused ? formatters2.timeWithSeconds : formatters2.timeNoSeconds).format(now);
        const text2 = this.showTimeZoneInStatusBar
            ? `${time2} ${this.getStatusBarTimeZoneLabel(now, this.timeZone2, formatters2)}`
            : time2;
        if (force || text2 !== this.lastTime2) {
            this.statusBar2.text = text2;
            this.lastTime2 = text2;
        }
    }

    private updateTooltips(now: Date, force: boolean): void {
        const date1 = this.getFormatters(this.timeZone1.timeZoneId).date.format(now);
        const baseOffsetMinutes1 = Math.round(this.timeZone1.baseUtcOffset * 60);
        const offsetMinutes1 = getUtcOffsetMinutes(now, this.timeZone1.timeZoneId);
        const dstInfo1 = offsetMinutes1 !== baseOffsetMinutes1
            ? this.i18n.t('clock.dstInfo', { base: formatUtcOffsetLabel(baseOffsetMinutes1) })
            : '';
        const tooltip1 = `${this.timeZone1.label} (${this.timeZone1.timeZoneId})\n${date1} ${formatUtcOffsetLabel(offsetMinutes1)}${dstInfo1}\n${this.i18n.t('clock.tooltip.clickToChange')}`;
        if (force || tooltip1 !== this.lastTooltip1) {
            this.statusBar1.tooltip = tooltip1;
            this.lastTooltip1 = tooltip1;
        }

        const date2 = this.getFormatters(this.timeZone2.timeZoneId).date.format(now);
        const baseOffsetMinutes2 = Math.round(this.timeZone2.baseUtcOffset * 60);
        const offsetMinutes2 = getUtcOffsetMinutes(now, this.timeZone2.timeZoneId);
        const dstInfo2 = offsetMinutes2 !== baseOffsetMinutes2
            ? this.i18n.t('clock.dstInfo', { base: formatUtcOffsetLabel(baseOffsetMinutes2) })
            : '';
        const tooltip2 = `${this.timeZone2.label} (${this.timeZone2.timeZoneId})\n${date2} ${formatUtcOffsetLabel(offsetMinutes2)}${dstInfo2}\n${this.i18n.t('clock.tooltip.clickToChange')}`;
        if (force || tooltip2 !== this.lastTooltip2) {
            this.statusBar2.tooltip = tooltip2;
            this.lastTooltip2 = tooltip2;
        }
    }

    private scheduleNextTick(forceReschedule: boolean): void {
        if (this.disposed) {
            return;
        }

        if (forceReschedule && this.tickHandle) {
            clearTimeout(this.tickHandle);
            this.tickHandle = undefined;
        }

        if (this.tickHandle) {
            return;
        }

        const nowMs = Date.now();
        const delay = this.focused ? msUntilNextSecond(nowMs) : msUntilNextMinute(nowMs);

        this.tickHandle = setTimeout(() => this.onTick(), delay);
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        if (this.tickHandle) {
            clearTimeout(this.tickHandle);
            this.tickHandle = undefined;
        }
        this.windowStateDisposable.dispose();
        this.configurationDisposable.dispose();
    }
}

let clockController: ClockController | undefined;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    // Initialize i18n early so all UI strings use the detected locale.
    I18nManager.getInstance().initialize();

    // ステータスバーアイテムを作成
    const statusBar1 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar1.command = 'otak-clock.selectTimeZone1';
    context.subscriptions.push(statusBar1);

    const statusBar2 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    statusBar2.command = 'otak-clock.selectTimeZone2';
    context.subscriptions.push(statusBar2);

    // アラームマネージャーを初期化
    const alarmManager = new AlarmManager(context, [statusBar1, statusBar2]);
    context.subscriptions.push(alarmManager);

    clockController = new ClockController(context, statusBar1, statusBar2, alarmManager);
    context.subscriptions.push(clockController);

    // コマンドを登録
    const disposable1 = vscode.commands.registerCommand('otak-clock.selectTimeZone1', async () => {
        const selectedTimeZone = await selectTimeZoneWithRegion();
        if (selectedTimeZone) {
            clockController?.setTimeZone1(selectedTimeZone);
        }
    });

    const disposable2 = vscode.commands.registerCommand('otak-clock.selectTimeZone2', async () => {
        const selectedTimeZone = await selectTimeZoneWithRegion();
        if (selectedTimeZone) {
            clockController?.setTimeZone2(selectedTimeZone);
        }
    });

    const disposableSwapTimeZones = vscode.commands.registerCommand('otak-clock.swapTimeZones', () => {
        clockController?.swapTimeZones();
    });

    // アラーム関連のコマンドを登録
    const disposableSetAlarm = vscode.commands.registerCommand('otak-clock.setAlarm', () => {
        return alarmManager.setAlarm();
    });
    const disposableToggleAlarm = vscode.commands.registerCommand('otak-clock.toggleAlarm', () => {
        return alarmManager.toggleAlarm();
    });

    const disposableEditAlarm = vscode.commands.registerCommand('otak-clock.editAlarm', () => {
        return alarmManager.editAlarm();
    });
    const disposableDeleteAlarm = vscode.commands.registerCommand('otak-clock.deleteAlarm', () => {
        return alarmManager.deleteAlarm();
    });
    const disposableListAlarms = vscode.commands.registerCommand('otak-clock.listAlarms', () => {
        return alarmManager.showAlarmMenu();
    });

    context.subscriptions.push(
        disposable1,
        disposable2,
        disposableSwapTimeZones,
        disposableSetAlarm,
        disposableToggleAlarm,
        disposableEditAlarm,
        disposableDeleteAlarm,
        disposableListAlarms
    );

    // 表示
    statusBar1.show();
    statusBar2.show();
}

// This method is called when your extension is deactivated
export function deactivate() {
    if (clockController) {
        clockController.dispose();
        clockController = undefined;
    }
}

// 地域選択を含むタイムゾーン選択関数
async function selectTimeZoneWithRegion(): Promise<TimeZoneInfo | undefined> {
    const i18n = I18nManager.getInstance();

    // まず地域を選択
    const regions = [...new Set(timeZones.map(tz => tz.region))].sort((a, b) => {
        if (a === 'Universal Time') {
            return -1;
        }
        if (b === 'Universal Time') {
            return 1;
        }
        return localizeRegion(a, i18n).localeCompare(localizeRegion(b, i18n));
    });

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
        timeZonesInRegion.map(tz => {
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
        }),
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
