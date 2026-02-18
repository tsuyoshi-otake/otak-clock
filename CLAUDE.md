# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run compile      # Compile TypeScript + copy i18n locale files to out/
npm run watch        # TypeScript watch mode with locale sync
npm run lint         # ESLint on src/
npm test             # Run all tests (compiles + lints first via pretest)
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

**`src/clock/ClockController.ts`** — Drives the dual clock display. Ticks every second when the VS Code window is focused, every minute when unfocused (CPU optimization). Manages tooltip content via `src/clock/tooltips.ts` and time formatting via `src/clock/formatters.ts`. Persists timezone selections to `context.globalState`.

**`src/alarm/AlarmManager.ts`** — Manages up to 5 daily alarms. Evaluates `tick(now)` every minute against stored alarms. Delegates notification UI to `AlarmNotificationController`. Normalizes and persists alarm state to `context.globalState`.

**`src/alarm/AlarmNotificationController.ts`** — Shows toast notifications with Stop/Snooze/Open-menu actions. Flashes status bar items during alarm. Repeats notification every 30 seconds until dismissed. Snooze delays by 3 minutes.

**`src/timezone/`** — `data.ts` holds the IANA timezone database with region grouping. `picker.ts` implements two-stage region → timezone quick-pick UI. `offsets.ts` computes UTC offsets with DST awareness.

**`src/i18n/I18nManager.ts`** — Singleton. Detects VS Code locale, loads matching JSON from `out/i18n/locales/`. Falls back to English. 18 languages supported.

**`src/utils/`** — `timing.ts` computes ms until next second/minute boundary for precise scheduling. `cache.ts` is an LRU cache (max 32 entries) for `Intl.DateTimeFormat` instances. `color.ts` handles status bar color manipulation.

### Data Flow

- Clock tick: `ClockController` interval → `formatters.ts` → update `StatusBarItem.text` + tooltip
- Alarm tick: `ClockController` calls `AlarmManager.tick(now)` each minute → if triggered, `AlarmNotificationController` fires toast + flashes status bar
- User selects timezone: command handler → `timezone/picker.ts` quick-pick → `ClockController` persists to globalState + redraws
- All alarm and timezone config is registered with `globalState.setKeysForSync()` for Settings Sync

### TypeScript Configuration

Strict mode with `noImplicitReturns`, `noUnusedParameters`, `noUnusedLocals`, `noFallthroughCasesInSwitch`. Target is ES2022, module system is Node16. ESLint enforces no floating promises, no explicit `any`, camelCase/PascalCase naming.

### VS Code Extension Settings

| Setting | Default | Description |
|---|---|---|
| `otak-clock.showTimeZoneInStatusBar` | `true` | Show timezone label next to clock |
| `otak-clock.alarmSoundEnabled` | `true` | Enable alarm sound on trigger |
| `otak-clock.alarmSoundType` | `"classic-alarm"` | Sound variant (`"classic-alarm"` or `"snake-ish"`) |
