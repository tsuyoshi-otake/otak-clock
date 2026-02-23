<p align="center">
  <h1 align="center">otak-clock</h1>
  <p align="center">Dual time zone clock and up to five daily alarms for VS Code.</p>
</p>

---

Show two clocks in the status bar and keep an eye on another time zone while you code.

![otak-clock](images/otak-clock.png)

## Quick Start

### Time Zones

1. Click either clock in the status bar.
2. Select a region (Americas, Europe, Asia, …).
3. Choose a time zone.

Repeat for the second clock to show two independent time zones simultaneously. Use **Swap Time Zones** from the Command Palette to flip them instantly.

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
3. When an alarm fires, a toast notification appears and the status bar flashes.

From the toast you can:
- **Stop** — dismiss the alarm (propagates to all VS Code windows immediately)
- **Snooze 3 min** — delays the next notification by 3 minutes
- **Open alarm menu** — jump directly to alarm management

Notifications repeat every 30 seconds until you press Stop. Alarms trigger once per day, resetting at midnight.

By default, alarms use the current system time zone on each device. To evaluate all alarms in a specific time zone instead, set `otak-clock.alarmTimeZone` in Settings.

You can set up to **5 alarms** at a time. Each alarm can be enabled or disabled independently.

## Features

- **Dual time zone clocks** — Two independent clocks in the status bar with full IANA time zone support.
- **Region-based time zone selection** — Time zones grouped by region for easy browsing.
- **Helpful tooltips** — Hover to see date, UTC offset, and DST information.
- **Multiple alarms** — Up to 5 alarms with per-alarm enable/disable.
- **Alarm time zone override** — Alarms use the current system time zone by default. Optionally set a global alarm time zone to evaluate all alarms in a specific time zone.
- **Cross-window alarm sync** — Pressing Stop in any VS Code window immediately dismisses the alarm in all other open windows on the same machine.
- **Snooze** — Delay alarm notifications by 3 minutes per snooze.
- **Persistent preferences** — Selected time zones and alarm settings survive restarts and are synced via Settings Sync.
- **Localized UI** — Full support for 18 languages: `ar` `de` `en` `es` `fr` `hi` `id` `it` `ja` `ko` `nl` `pt` `ru` `th` `tr` `vi` `zh-cn` `zh-tw`

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

Access via the Command Palette (`Cmd/Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `Select Time Zone 1` | Change the first clock's time zone |
| `Select Time Zone 2` | Change the second clock's time zone |
| `Swap Time Zones` | Flip Time Zone 1 and Time Zone 2 |
| `Set Alarm Time` | Add a new alarm |
| `Edit Alarm` | Change an existing alarm's time |
| `Toggle Alarm` | Enable or disable an alarm |
| `Delete Alarm` | Remove an alarm |
| `Manage Alarm` | Open the alarm management menu |

## How It Works

### Cross-Window Alarm Synchronization

otak-clock uses VS Code's shared `globalState` as an IPC channel between windows. When you press **Stop** in one window:

1. The dismissal is written to `globalState` (`dismissedOn` field).
2. All other windows detect the change within ~1 second (focused) or ~1 minute (unfocused) via the periodic tick.
3. Any active alarm notification session in those windows is stopped automatically.

Snooze state is also shared — snoozing in one window delays the alarm in all windows.

### Settings Sync

Alarm configuration (time and enabled/disabled state) is stored under VS Code's Settings Sync scope and will sync across machines. The runtime state (whether today's alarm already fired, snooze timer, dismissal) is stored locally per device and is not synced.

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

- **[otak-monitor](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor)** — Real-time system monitoring in VS Code.
- **[otak-proxy](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy)** — One-click proxy management for VS Code, Git, npm, and terminals.
- **[otak-committer](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer)** — AI-assisted commit messages, pull requests, and issues.
- **[otak-restart](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart)** — Quick reload shortcuts.
- **[otak-pomodoro](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro)** — Pomodoro timer in VS Code.
- **[otak-zen](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen)** — Minimal, distraction-free VS Code UI.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)**
- **[GitHub](https://github.com/tsuyoshi-otake/otak-clock)**
- **[Issues](https://github.com/tsuyoshi-otake/otak-clock/issues)**
