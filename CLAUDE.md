# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run compile      # Compile TypeScript + copy i18n locale files to out/
npm run watch        # TypeScript watch mode with locale sync
npm run lint         # ESLint on src/
npm test             # Run all tests (compiles + lints first via pretest)
npx vsce package     # Build .vsix package
npm version patch --no-git-tag-version  # Bump patch version without git tag
```

Tests run via `@vscode/test-cli` against compiled output in `out/test/**/*.test.js`. There is no way to run a single test file directly from the CLI — run `npm test` and filter by reading test output.

After any source change, run `npm run compile` before testing, since tests execute compiled JS from `out/`.

**Important:** The compile step also copies `src/i18n/locales/` to `out/i18n/locales/`. If you add or modify locale JSON files, `npm run compile` must be re-run (not just `tsc`).

## Architecture

This is a VS Code extension providing dual time zone clocks and alarm management in the status bar.

### Entry Point

`src/extension.ts` — `activate()` bootstraps everything:
1. Initializes `I18nManager` singleton
2. Registers keys for VS Code Settings Sync (timezone selections, alarm config)
3. Creates two `StatusBarItem` instances (primary clock and secondary clock)
4. Instantiates `AlarmManager` and `ClockController`
5. Registers 8 commands (`otak-clock.*`)

### Core Components

**`src/clock/ClockController.ts`** — Drives the dual clock display. Schedules `onTick()` every second when focused, every minute when unfocused. Calls `runMinuteTick()` on each tick, which deduplicates by minute bucket so alarm logic runs at most once per minute. Manages tooltip content via `src/clock/tooltips.ts` and time formatting via `src/clock/formatters.ts`. Persists timezone selections to `context.globalState`.

**`src/alarm/AlarmManager.ts`** — Manages up to 5 daily alarms. On each minute tick, calls `refreshFromGlobalState()` to pick up changes from other windows, then calls `notifier.checkForExternalDismissal()`, then evaluates each alarm via `alarmTick.ts`. Delegates notification UI to `AlarmNotificationController`. Normalizes and persists alarm state to `context.globalState`.

**`src/alarm/AlarmNotificationController.ts`** — Shows toast notifications with Stop/Snooze/Open-menu actions. Flashes status bar items during alarm. Repeats notification every 30 seconds until dismissed. Snooze delays by 3 minutes. When **Stop** is pressed, calls `dismissAlarms()` callback to write `dismissedOn` to globalState before stopping the local session — this lets other windows detect the dismissal. `checkForExternalDismissal()` is called from `AlarmManager.tick()` every minute to stop the local session if another window already dismissed.

**`src/alarm/alarmTick.ts`** — Pure function `evaluateAlarmTick(alarm, now, lastNotificationTimeMs, alarmTimeZone?)` returns `{ action: 'none' | 'save' | 'trigger', alarm, todayKey }`. Uses `getWallClock()` to resolve wall-clock time in the specified timezone (falls back to system-local `Date` methods when `alarmTimeZone` is undefined). Handles: `dismissedOn` guard (cross-window stop), day-change resets, snooze expiry, duplicate-notification cooldown.

**`src/alarm/AlarmSettings.ts`** — Defines `AlarmConfig` (id, enabled, hour, minute, timeZoneId — Settings Sync'd) and `AlarmRuntime` (triggered, lastTriggeredOn, timeSignature, snoozeUntilMs, dismissedOn — local only). `AlarmSettings = AlarmConfig & AlarmRuntime`. `timeZoneId` records the IANA timezone auto-detected when the alarm was created or edited.

**`src/timezone/`** — `data.ts` holds the IANA timezone database with region grouping. `picker.ts` implements two-stage region → timezone quick-pick UI. `offsets.ts` computes UTC offsets with DST awareness.

**`src/i18n/I18nManager.ts`** — Singleton. Detects VS Code locale, loads matching JSON from `out/i18n/locales/`. Falls back to English. 18 languages fully supported: `ar de en es fr hi id it ja ko nl pt ru th tr vi zh-cn zh-tw`. All locale files contain identical key sets — do not add a key to one without adding it to all 18.

**`src/utils/`** — `timing.ts` computes ms until next second/minute boundary for precise scheduling. `cache.ts` is an LRU cache (max 32 entries) for `Intl.DateTimeFormat` instances. `color.ts` handles status bar color manipulation.

### Data Flow

- **Clock tick**: `ClockController` timeout → `onTick()` → `updateClockText()` → update `StatusBarItem.text`
- **Alarm tick**: `onTick()` → `runMinuteTick()` (deduped per minute) → `AlarmManager.tick(now)` → `refreshFromGlobalState()` + `checkForExternalDismissal()` + `evaluateAlarmTick()` per alarm → if triggered, `AlarmNotificationController.startOrMerge()` fires toast + flashes status bar
- **Cross-window Stop**: Stop button → `dismissAlarms()` writes `dismissedOn: todayKey` to globalState → other windows detect via `checkForExternalDismissal()` on next minute tick
- **User selects timezone**: command handler → `timezone/picker.ts` quick-pick → `ClockController` persists to globalState + redraws
- **Settings Sync**: `AlarmConfig` (hour/minute/enabled) and timezone IDs are registered with `globalState.setKeysForSync()`. `AlarmRuntime` state (triggered, snooze, dismissedOn) is local-only.

### TypeScript Configuration

Strict mode with `noImplicitReturns`, `noUnusedParameters`, `noUnusedLocals`, `noFallthroughCasesInSwitch`. Target is ES2022, module system is Node16. ESLint enforces no floating promises, no explicit `any`, camelCase/PascalCase naming.

### VS Code Extension Settings

| Setting | Default | Description |
|---|---|---|
| `otak-clock.showTimeZoneInStatusBar` | `true` | Show timezone label next to clock |
| `otak-clock.alarmSoundEnabled` | `true` | Enable alarm sound on trigger |
| `otak-clock.alarmSoundType` | `"classic-alarm"` | Sound variant: `"classic-alarm"` or `"snake-ish"` |
| `otak-clock.alarmTimeZone` | `"auto"` | Alarm evaluation timezone. `"auto"` uses each alarm's saved timezone; specific IANA ID overrides all alarms |
