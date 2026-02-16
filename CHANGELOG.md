# Change Log

All notable changes to the "otak-clock" extension will be documented in this file.

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
