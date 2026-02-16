<p align="center">
  <h1 align="center">otak-clock</h1>
  <p align="center">Dual time zone clock and a simple daily alarm for VS Code.</p>
</p>

---

Show two clocks in the status bar and keep an eye on another time zone while you code.

![otak-clock](images/otak-clock.png)

## Quick Start

### Time Zones

1. Click a clock in the status bar.
2. Select a region.
3. Choose a time zone.

The clocks display time in 24-hour format (`HH:mm:ss`) and show date/time zone details on hover.

To reduce CPU usage, otak-clock updates once per minute (and shows `HH:mm`) when the VS Code window is not focused.

### Alarm

1. Click the bell icon (`$(bell)`) in the status bar.
2. Select an action (Set, Edit, Toggle, Delete).
3. Enter a time in `HH:mm` (when setting or editing).

When the alarm triggers, otak-clock shows a notification and flashes the clock status bar items. The alarm uses your local system time and triggers once per day (it resets at midnight).

## Features

- **Dual time zone clocks** — Two independent time zones in the status bar.
- **Region-based selection** — Pick from common IANA time zones grouped by region.
- **Helpful tooltips** — Hover to see date and time zone details.
- **Simple alarm** — One alarm with a notification and a short status bar flash.
- **Persistent preferences** — Keeps your selected time zones and alarm time between sessions.

## How It Works

### Status Bar

- Two clock items: click to change each time zone.
- Alarm item: click to manage the alarm (set, edit, toggle, delete).

### Status Indicators

- `$(bell) HH:mm` — Alarm enabled
- `$(bell-slash) HH:mm` — Alarm disabled
- `$(bell) $(add)` — No alarm set (click to set)
- `HH:mm:ss` — Clock time (when focused)
- `HH:mm` — Clock time (when unfocused)

## Configuration

No configuration is required.

## Commands

Access via the Command Palette (`Cmd/Ctrl+Shift+P`):

- `Select Time Zone 1`
- `Select Time Zone 2`
- `Set Alarm Time`
- `Toggle Alarm`
- `Edit Alarm`
- `Delete Alarm`
- `Manage Alarm`

## Requirements

- Visual Studio Code 1.90.0 or higher

## Installation

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock).
2. Click a clock (or the bell) in the status bar to get started.

## Security & Privacy

- No telemetry or usage analytics.
- No network requests: everything runs locally.
- Time zones and alarm settings are stored in VS Code extension storage.

## Troubleshooting

- **Clocks not updating**: Reload the VS Code window and confirm the extension is enabled.
- **Alarm did not fire**: Verify your system time and that the alarm is enabled (shows `$(bell) HH:mm`).

## Related Extensions

- **[otak-monitor](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor)** — Real-time system monitoring in VS Code.
- **[otak-proxy](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy)** — One-click proxy management for VS Code, Git, npm, and terminals.
- **[otak-committer](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer)** — AI-assisted commit messages, pull requests, and issues.
- **[otak-restart](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart)** — Quick reload shortcuts.
- **[otak-clock](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)** — Dual time zone clock for VS Code.
- **[otak-pomodoro](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro)** — Pomodoro timer in VS Code.
- **[otak-zen](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen)** — Minimal, distraction-free VS Code UI.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)**
- **[GitHub](https://github.com/tsuyoshi-otake/otak-clock)**
- **[Issues](https://github.com/tsuyoshi-otake/otak-clock/issues)**
