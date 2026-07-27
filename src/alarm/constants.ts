export const ALARM_CONFIG_KEY = 'alarmConfig';
export const ALARM_RUNTIME_KEY = 'alarmRuntime';
export const LEGACY_ALARM_STATE_KEY = 'alarm';
export const MAX_ALARMS = 5;

export const STATUS_BAR_ALARM_PRIORITY = 98;

export const NOTIFICATION_COOLDOWN_MS = 60_000;
export const PROGRESS_NOTIFICATION_DISPLAY_MS = 3_000;
export const ALARM_REPEAT_INTERVAL_MS = 30_000;
export const ALARM_SNOOZE_DURATION_MS = 3 * 60_000;
export const ALARM_TIME_ZONE_SETTING = 'otak-clock.alarmTimeZone';

/**
 * アラーム時刻を過ぎてから発火を許容する猶予（分）。スリープ復帰やタイマー遅延の取りこぼし救済用。
 * 上限を超えたら救済しない（無制限にすると、朝のアラームが夕方の起動で鳴ってしまう）。
 */
export const ALARM_CATCH_UP_WINDOW_MINUTES = 5;

/**
 * DSTの春時間移行でアラーム時刻の壁時計表現がその日存在しない場合に、
 * ギャップ明けの最初に存在する時刻を探索する上限（分）。
 * 実際のDSTギャップはほぼ常に30〜60分だが、余裕を持って180分とする。
 * この値は同時に「ギャップ救済ロジックをそもそも検討するか」の判定にも使う
 * （猶予幅を超えてこの範囲内であれば、DSTギャップの可能性を調べる）。
 */
export const ALARM_DST_GAP_SEARCH_MINUTES = 180;

