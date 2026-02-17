# Change Log

All notable changes to the "otak-clock" extension will be documented in this file.

## [1.1.20] - 2026-02-17

### Changed
- Refactored command registration and removed unnecessary global state in `extension.ts`.
- Persisted selected time zones as `timeZoneId` strings in `globalState` (with migration from the previous object format).
- Refactored alarm tick evaluation to accept `Date` and extracted helper functions for clarity.
- Extracted status bar flashing into `utils/statusBar` and removed VS Code dependencies from `utils/color`.
- Extracted shared helpers: FIFO cache eviction (`utils/cache`) and `unknown` record guard (`utils/guards`).
- Introduced `MS_PER_SECOND` / `MS_PER_MINUTE` constants in `utils/timing` to avoid magic numbers.

### Fixed
- Added a safe fallback for UTC offset calculations when `Intl` formatting fails (uses base UTC offset).

### Added
- Replaced the sample extension test with a command registration test.

## [1.1.19] - 2026-02-17

### Changed
- Added explicit `: void` return types to `activate()` and `deactivate()` in `extension.ts`.
- Added runtime validation to `loadLocaleFile` for `JSON.parse` result.
- Extracted `UTC_FALLBACK_TIMEZONE` constant from `data.ts`, eliminating duplicate inline object in `ClockController.ts`.
- Extracted `buildTimeZonePickerItem` pure function from `selectTimeZoneWithRegion` for testability.

### Added
- Unit tests for alarm settings edge cases, data constants, formatters, picker items, alarm tick, and alarm status (~15 new tests).

## [1.1.18] - 2026-02-17

### Changed
- Promoted ESLint `only-throw-error`, `curly`, and `semi` from warn to error.
- Converted `isSupportedLocale` to a type guard, removing `as SupportedLocale` casts.
- Unified `coerceTimeZoneId` inline type assertion to `Record<string, unknown>` pattern.
- Replaced `formatterCache.clear()` / `offsetPartsFormatterCache.clear()` with FIFO single-entry eviction.
- Extracted `buildAlarmStatusBarState` pure function from AlarmManager for testability.

### Fixed
- `hexToRgb` now returns `null` for non-hex characters instead of `{ r: NaN, g: NaN, b: NaN }`.

### Added
- Unit tests for alarm status bar state, coerceTimeZoneId edge cases, Nepal 45-min offset, color conversions, tooltip content, and midnight alarm (~15 new tests).

## [1.1.17] - 2026-02-17

### Changed
- Removed unnecessary `getAlarm()` indirection in AlarmManager (direct field access).
- Renamed `_todayKey` to `todayKey` in AlarmManager (parameter is used, not unused).
- Simplified `substituteParams` in I18nManager using `replaceAll` (fixes `$` in values bug).
- Extracted `compareRegions` from picker for testability.
- Exported `coerceTimeZoneId` and `ALARM_TIME_REGEX` for testability.
- Promoted ESLint `no-floating-promises` and `no-explicit-any` from warn to error.
- Replaced deprecated `no-throw-literal` with `@typescript-eslint/only-throw-error`.

### Added
- Unit tests for `coerceTimeZoneId`, `compareRegions`, `ALARM_TIME_REGEX`, EST/EDT labels, and i18n edge cases (~17 new tests).

### Removed
- Deleted `vsc-extension-quickstart.md` (generator boilerplate).

## [1.1.16] - 2026-02-17

### Changed
- Enabled strict TypeScript checks: `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedParameters`, `noUnusedLocals`.
- Added ESLint type-aware rules: `no-floating-promises`, `no-explicit-any`, upgraded `eqeqeq` to error.
- Fixed floating promises in AlarmManager (`void` prefix on `withProgress` calls).
- Added `isDisposed` guard to AlarmManager to prevent post-dispose side effects.
- Fixed `flashStatusBars` interval leak by returning a `Disposable`.
- Extracted magic string `'alarm'` to `ALARM_STATE_KEY` constant.
- Optimized `.vscodeignore` to exclude `.vsix`, `package-lock.json`, and `CHANGELOG.md`.

### Added
- Unit tests for color utilities, timezone data integrity, i18n locale resolution, and tooltip DST handling (~50 new tests).

## [1.1.15] - 2026-02-17

### Security
- Added runtime validation for alarm settings loaded from globalState to prevent corrupted or tampered data.
- Added whitelist validation to `coerceTimeZoneId` to reject unknown time zone IDs early.

### Changed
- Updated devDependencies: `@types/vscode` 1.109.0, `@types/node` 20.19.33, `@typescript-eslint/*` 8.56.0, `typescript` 5.9.3, `@vscode/test-cli` 0.0.12, `@vscode/test-electron` 2.5.2.

### Added
- Validation tests for `validateAlarmSettings` (7 new tests).

## [1.1.14] - 2026-02-17

### Changed
- Refactored codebase for improved maintainability: extracted ClockController, formatters, tooltips, timezone picker, alarm tick logic, and constants into dedicated modules.
- Eliminated code duplication in status bar text and tooltip generation.
- Replaced magic numbers with named constants.
- Improved variable naming for clarity (e.g., `primaryStatusBar`, `isFocused`, `isDisposed`).

### Added
- Unit tests for pure functions: timing, offsets, formatters, tooltips, alarm tick, and alarm settings (42 tests).

## [1.1.13] - 2026-02-16

### Added
- UI localization support for Spanish, French, German, Portuguese, Italian, Dutch, Russian, Arabic, Turkish, Indonesian, Thai, and Hindi.

## [1.1.12] - 2026-02-16

### Added
- UI localization support for Vietnamese.

## [1.1.11] - 2026-02-16

### Added
- UI localization support for Chinese (Simplified/Traditional) and Korean.

## [1.1.10] - 2026-02-16

### Changed
- Enabled time zone labels in the status bar by default.

## [1.1.9] - 2026-02-16

### Added
- UI localization support (English/Japanese) for prompts, tooltips, and alarm messages.

## [1.1.8] - 2026-02-16

### Added
- Optional setting to show a short time zone label (e.g., UTC/JST) next to each clock in the status bar.

## [1.1.7] - 2026-02-16

### Added
- Swap Time Zones command.

### Changed
- Show DST-aware UTC offsets in clock tooltips and the time zone picker.
- Improved clock tooltips with clearer action hints.

## [1.1.6] - 2026-02-16

### Added
- Alarm management menu from the status bar (set, edit, toggle, delete).

### Changed
- Improved status bar indicators for alarm enabled/disabled state.
- When the VS Code window is not focused, the clocks update once per minute and display `HH:mm` to reduce CPU usage.
- Removed unused settings entry (`otakClock.alarmSounds`).

## [1.1.5] - 2026-02-15

### Changed
- Reduced clock update overhead (cached formatters and smarter refresh scheduling).
- Reduced alarm check frequency to once per minute to lower CPU usage.

### Fixed
- Improved daily alarm reset behavior across restarts and upgrades.

### Security
- Updated dev dependencies via `npm audit fix` (0 known vulnerabilities).

### Updated
- Updated README.md structure to match the standard format.

## [1.1.4] - 2025-03-01

### Updated
- Updated README.md documentation

## [1.1.3] - 2024-02-24

### Changed
- Updated **README.md** to reflect version **1.1.3**.
- Improved documentation clarity and formatting in the README.

### Fixed
- Resolved minor typos and inconsistencies in the README.

## [1.1.0] - 2024-02-24

### Added
- Single alarm feature with visual notifications.
- Status bar alarm control ($(bell) icon).
- Simple time-based alarm settings (HH:mm format).
- Auto-dismissing notifications (5 seconds).
- Visual feedback with status bar flash effect.

### Changed
- Simplified time zone display with date information.
- Improved timezone selection interface.

## [1.0.0] - Initial Release

- Dual timezone display in status bar.
- Region-based timezone selection.
- Detailed timezone information on hover.
