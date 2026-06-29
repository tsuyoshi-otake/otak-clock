<div align="center">

# otak-clock

**Dual time-zone clocks and daily alarms for the VS Code status bar.**  
otak-clock keeps two selectable world clocks visible, manages up to five daily alarms, and runs locally with no telemetry or network calls.

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/odangoo.otak-clock?label=Marketplace&color=1d4ed8)](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)
[![VS Code engine](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007acc)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-otak--clock-24292f)](https://github.com/tsuyoshi-otake/otak-clock)

![Dual clocks](https://img.shields.io/badge/clocks-dual%20time%20zone-0f766e)
![Daily alarms](https://img.shields.io/badge/alarms-up%20to%205-2563eb)
![Localized UI](https://img.shields.io/badge/UI-localized-7c3aed)
![No telemetry](https://img.shields.io/badge/telemetry-none-64748b)
![Zero network calls](https://img.shields.io/badge/network-zero%20calls-334155)

[**Install**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock) ·
[**GitHub**](https://github.com/tsuyoshi-otake/otak-clock) ·
[**Report an issue**](https://github.com/tsuyoshi-otake/otak-clock/issues)

</div>

---

Working across regions usually means checking another city before you send a message, schedule a meeting, or wait on a teammate. **otak-clock keeps two world clocks and a small alarm controller in the status bar**, so timezone checks and reminders stay inside VS Code without opening a browser or a separate clock app.

![otak-clock status bar](images/otak-clock.png)

## Quick Start

1. **Install** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock).
2. Click either clock in the status bar.
3. Select a region such as Americas, Europe, or Asia.
4. Choose the time zone you want to display.

Repeat the same steps for the second clock. Use **Swap Time Zones** from the Command Palette when you want to switch the two status-bar positions.

The clocks use 24-hour time:

| Window state | Display |
| --- | --- |
| Focused | `HH:mm:ss` |
| Unfocused | `HH:mm` |

Hover over a clock to see the full date, IANA time zone ID, UTC offset, and DST status.

## Alarms

Click the bell icon in the status bar to open the alarm menu:

| Action | What it does |
| --- | --- |
| **Set** | Adds a new alarm time in `HH:mm` format |
| **Edit** | Changes an existing alarm time |
| **Toggle** | Enables or disables an alarm without deleting it |
| **Delete** | Removes an alarm |

When an alarm fires, otak-clock shows a notification and flashes the status bar. Notifications repeat every 30 seconds until you stop the alarm.

| Notification action | Result |
| --- | --- |
| **Stop** | Dismisses the alarm in all open VS Code windows on the same machine |
| **Snooze 3 min** | Delays the next notification by 3 minutes |
| **Open alarm menu** | Opens the alarm management menu |

You can create up to **5 daily alarms**. Each alarm can be enabled or disabled independently, fires once per day, and resets at midnight.

## Capabilities

- **Dual status-bar clocks**: show two independent IANA time zones without leaving VS Code.
- **Region-based picker**: select time zones through a region-first Quick Pick flow.
- **Focus-aware refresh**: update every second while focused and every minute while unfocused to reduce background work.
- **Detailed tooltips**: inspect the full date, time zone ID, UTC offset, and DST status.
- **Multiple daily alarms**: manage up to five alarms from the status bar.
- **Snooze and repeat notifications**: snooze for 3 minutes, or keep receiving reminders every 30 seconds until stopped.
- **Cross-window dismissal**: pressing Stop in one VS Code window dismisses the same alarm in other windows.
- **Configurable alarm sound**: enable or disable sound and choose between `classic-alarm` and `snake-ish`.
- **Alarm time-zone override**: keep `auto` for each device's current system time zone, or choose a specific IANA time zone for all alarms.
- **Settings Sync support**: sync selected clocks and alarm configuration through VS Code Settings Sync.
- **Localized interface**: UI messages follow your VS Code display language.

## How It Works

### Clock Refresh

otak-clock schedules status-bar updates based on the VS Code window focus state. Focused windows show seconds and refresh every second. Unfocused windows show minute-level time and refresh on minute boundaries.

### Alarm Evaluation

In the default `otak-clock.alarmTimeZone = auto` mode, alarms are evaluated using the current system time zone on each device. If you choose a specific IANA time zone in Settings, every alarm is evaluated against that time zone instead.

### Cross-Window Synchronization

otak-clock uses VS Code's shared `globalState` to coordinate alarm dismissal between windows on the same machine. When you press **Stop** in one window:

1. The dismissal date is written to `globalState`.
2. Other windows detect the change on their next alarm tick.
3. Active notification sessions for the same alarm stop automatically.

### Settings Sync

Clock selections and alarm configuration are registered for VS Code Settings Sync. Runtime state, such as whether today's alarm has already fired, snooze timers, and dismissal markers, stays local to the current machine.

## Status Bar Reference

| Display | Meaning |
| --- | --- |
| `$(bell) HH:mm JST` | At least one alarm is enabled |
| `$(bell-slash) HH:mm JST` | All alarms are disabled |
| `$(bell) $(add)` | No alarm is set |
| `HH:mm:ss UTC` | Focused clock with time zone label |
| `HH:mm JST` | Unfocused clock with time zone label |

## Settings

| Setting | Default | Values |
| --- | --- | --- |
| `otak-clock.showTimeZoneInStatusBar` | `true` | Shows a short label such as `UTC` or `JST` next to each clock |
| `otak-clock.alarmSoundEnabled` | `true` | Plays a short sound when alarm notifications appear |
| `otak-clock.alarmSoundType` | `classic-alarm` | `classic-alarm` uses an A6/C7-style pattern; `snake-ish` uses a retro game-like pattern |
| `otak-clock.alarmTimeZone` | `auto` | `auto` uses each device's current system time zone; choose a specific IANA time zone to override all alarms |

## Commands

Open these commands from the Command Palette with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on macOS):

| Command | Description |
| --- | --- |
| `Select Time Zone 1` | Change the first clock's time zone |
| `Select Time Zone 2` | Change the second clock's time zone |
| `Swap Time Zones` | Swap the two clock positions |
| `Set Alarm Time` | Add a new alarm |
| `Edit Alarm Time` | Change an existing alarm time |
| `Toggle Alarm` | Enable or disable an alarm |
| `Delete Alarm` | Remove an alarm |
| `Manage Alarm` | Open the alarm management menu |

## Security & Privacy

otak-clock is designed for local use inside VS Code.

- **Local processing**: clock and alarm logic runs in the extension host.
- **Zero network access**: the extension does not make network requests.
- **No telemetry**: no analytics, usage tracking, or external logging.
- **No account or API key**: nothing to sign in to and no credentials to configure.
- **Scoped persistence**: settings are stored through VS Code configuration and extension `globalState`.
- **Open source, MIT-licensed**: the implementation is auditable on [GitHub](https://github.com/tsuyoshi-otake/otak-clock).

## Language Support

The interface follows your VS Code display language:

**English** · 日本語 · 简体中文 · 繁體中文 · 한국어 · Tiếng Việt · Español · Português · Français · Deutsch · हिन्दी · Bahasa Indonesia · Italiano · Nederlands · Русский · العربية · ไทย · Türkçe

## Requirements

- VS Code **1.90.0** or newer

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock), or run:

```text
ext install odangoo.otak-clock
```

<details>
<summary><strong>Build from source (VSIX)</strong></summary>

```bash
npm install
npm run compile
npx vsce package
code --install-extension otak-clock-1.1.34.vsix
```

Reload VS Code after installation if the extension was already active.

</details>

## Troubleshooting

- **Clocks are not updating**: reload the VS Code window and confirm the extension is enabled.
- **The time zone label is missing**: check that `otak-clock.showTimeZoneInStatusBar` is enabled.
- **An alarm did not fire**: confirm the alarm is enabled, verify your system time, and check `otak-clock.alarmTimeZone` if you configured an override.
- **An alarm fired in one window but not another**: make sure the extension is active in both windows. Unfocused windows may detect alarms up to about 1 minute later.
- **Alarm sound is missing**: verify `otak-clock.alarmSoundEnabled` and your system audio output.

## Related Extensions

More VS Code extensions by [odangoo](https://marketplace.visualstudio.com/publishers/odangoo):

| Extension | Description |
| --- | --- |
| [**otak-paste**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-paste) | Paste optimized screenshots into Markdown assets |
| [**otak-proxy**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy) | One-click proxy switching for VS Code, Git, npm, and integrated terminals |
| [**otak-monitor**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor) | Real-time CPU, memory, and disk usage in the status bar |
| [**otak-committer**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer) | AI-assisted commit messages, pull requests, and issues |
| [**otak-clipboard**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clipboard) | Copy a folder or the current tab to your clipboard in two clicks |
| [**otak-pomodoro**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro) | A Pomodoro focus timer built into VS Code |
| [**otak-restart**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart) | Quick Extension Host and window restart from the status bar |
| [**otak-zen**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen) | A calm, distraction-free Zen mode for VS Code |
| [**otak-lsp**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-lsp) | Japanese morphological analysis with grammar checks, semantic highlights, and hovers |
| [**otak-usage**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-usage) | At-a-glance usage statistics for VS Code |

## License

Released under the [MIT License](LICENSE).

<div align="center">
<br>
<sub>Built by <a href="https://github.com/tsuyoshi-otake">tsuyoshi-otake</a> · <a href="https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock">Marketplace</a> · <a href="https://github.com/tsuyoshi-otake/otak-clock">GitHub</a> · <a href="https://github.com/tsuyoshi-otake/otak-clock/issues">Issues</a></sub>
</div>
