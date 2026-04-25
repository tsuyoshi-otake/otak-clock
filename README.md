<p align="center">
  <h1 align="center">otak-clock</h1>
  <p align="center">Dual time zone clocks and up to five daily alarms for VS Code.</p>
</p>

---

Display two time zones in the status bar while you work in VS Code.

![otak-clock](images/otak-clock.png)

## Quick Start

### Time Zones

1. Click either clock in the status bar.
2. Select a region (Americas, Europe, Asia, …).
3. Choose a time zone.

Repeat this for the second clock to show two independent time zones at once. Use **Swap Time Zones** from the Command Palette to switch their positions.

The clocks display time in 24-hour format:
- Focused window: `HH:mm:ss` (updated every second)
- Unfocused window: `HH:mm` (updated every minute to reduce CPU usage)

Hover over a clock to see the full date, IANA time zone ID, UTC offset, and DST status.

### Alarm

1. Click the bell icon (`$(bell)`) in the status bar.
2. Choose an action from the menu:
   - **Set** — enter a new alarm time in `HH:mm` format
   - **Edit** — change the time of an existing alarm
   - **Toggle** — enable or disable an alarm without deleting it
   - **Delete** — remove an alarm permanently
3. When an alarm fires, a notification appears and the status bar flashes.

From the notification, you can:
- **Stop** — dismiss the alarm in all VS Code windows immediately
- **Snooze 3 min** — delay the next notification by 3 minutes
- **Open alarm menu** — open the alarm management menu

Notifications repeat every 30 seconds until you press Stop. Each alarm triggers once per day and resets at midnight.

By default, alarms use the current system time zone on each device. To evaluate all alarms in a specific time zone instead, set `otak-clock.alarmTimeZone` in Settings.

You can create up to **5 alarms** at a time. Each alarm can be enabled or disabled independently.

## Features

- **Dual time zone clocks** — Two independent clocks in the status bar using IANA time zone IDs.
- **Region-based time zone selection** — Time zones are grouped by region.
- **Clock tooltips** — Hover to see the date, UTC offset, and DST information.
- **Multiple alarms** — Up to 5 alarms, each with its own enable/disable state.
- **Alarm time zone override** — Alarms use the current system time zone by default. Set a global alarm time zone to evaluate all alarms in a specific time zone.
- **Cross-window alarm sync** — Pressing Stop in any VS Code window immediately dismisses the alarm in all other open windows on the same machine.
- **Snooze** — Delay alarm notifications by 3 minutes each time you snooze.
- **Persistent preferences** — Selected time zones and alarm settings are saved and synced via Settings Sync.
- **Localized UI** — Available in 18 languages: `ar` `de` `en` `es` `fr` `hi` `id` `it` `ja` `ko` `nl` `pt` `ru` `th` `tr` `vi` `zh-cn` `zh-tw`

## Status Bar Reference

| Display | Meaning |
|---|---|
| `$(bell) HH:mm JST` | At least one alarm is enabled |
| `$(bell-slash) HH:mm JST` | All alarms are disabled |
| `$(bell) $(add)` | No alarm set — click to set one |
| `HH:mm:ss UTC` | Clock (focused window, with time zone label) |
| `HH:mm JST` | Clock (unfocused window, with time zone label) |

## Configuration

| Setting | Default | Description |
|---|---|---|
| `otak-clock.showTimeZoneInStatusBar` | `true` | Show a short time zone label (e.g., UTC, JST) next to each clock in the status bar |
| `otak-clock.alarmSoundEnabled` | `true` | Enable alarm sound when a notification appears |
| `otak-clock.alarmSoundType` | `classic-alarm` | Alarm sound pattern: `classic-alarm` (A6/C7 style) or `snake-ish` (retro game-like) |
| `otak-clock.alarmTimeZone` | `auto` | Time zone for alarm evaluation. `auto` uses the current system time zone on each device; choose a specific IANA time zone to override all alarms |

## Commands

Open these commands from the Command Palette (`Cmd/Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `Select Time Zone 1` | Change the first clock's time zone |
| `Select Time Zone 2` | Change the second clock's time zone |
| `Swap Time Zones` | Swap Time Zone 1 and Time Zone 2 |
| `Set Alarm Time` | Add a new alarm |
| `Edit Alarm` | Change an existing alarm's time |
| `Toggle Alarm` | Enable or disable an alarm |
| `Delete Alarm` | Remove an alarm |
| `Manage Alarm` | Open the alarm management menu |

## How It Works

### Cross-Window Alarm Synchronization

otak-clock uses VS Code's shared `globalState` as an IPC channel between windows. When you press **Stop** in one window:

1. The dismissal is written to `globalState` (`dismissedOn` field).
2. Other windows detect the change within ~1 second when focused, or ~1 minute when unfocused.
3. Active alarm notifications in those windows stop automatically.

Snooze state is shared as well. Snoozing in one window delays the alarm in all windows.

### Settings Sync

Alarm configuration (time and enabled/disabled state) is included in VS Code Settings Sync and syncs across machines. Runtime state (whether today's alarm has already fired, snooze timer, and dismissal state) is stored locally on each device and is not synced.

## Requirements

- Visual Studio Code 1.90.0 or higher

## Installation

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock).
2. Click a clock (or the bell) in the status bar to get started.

## Security & Privacy

- No telemetry or usage analytics.
- No network requests — everything runs locally.

## Troubleshooting

- **Clocks not updating**: Reload the VS Code window and confirm the extension is enabled.
- **Alarm did not fire**: Check that the alarm is enabled (`$(bell) HH:mm JST` in the status bar) and verify your system time. If you set `alarmTimeZone`, make sure the selected time zone matches your intent.
- **Alarm fired in one window but not another**: Ensure the extension is active in all windows. Unfocused windows may detect alarms up to ~1 minute later.

## Related Extensions

- **[otak-monitor](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor)** — System monitoring in VS Code.
- **[otak-proxy](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy)** — Proxy management for VS Code, Git, npm, and terminals.
- **[otak-committer](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer)** — AI-assisted commit messages, pull requests, and issues.
- **[otak-restart](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart)** — Reload shortcuts.
- **[otak-pomodoro](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro)** — Pomodoro timer in VS Code.
- **[otak-zen](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen)** — A minimal VS Code UI.

## License

MIT License. See the [LICENSE](LICENSE) file for details.

## Links

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)**
- **[GitHub](https://github.com/tsuyoshi-otake/otak-clock)**
- **[Issues](https://github.com/tsuyoshi-otake/otak-clock/issues)**
