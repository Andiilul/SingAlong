# SingAlong

SingAlong displays synchronized Spotify Desktop lyrics in a customizable Windows overlay. Follow the current line and preview the next while gaming or using other apps.

The current development version is **0.3.1**. Playback synchronization and fullscreen focus handling are still being refined.

## Getting started

Use Windows 10 version 1809 or later, Spotify Desktop, Node.js 22.12 or later, and npm. Internet access is required to download dependencies and fetch lyrics.

Run these commands from the project folder in PowerShell.

```powershell
npm.cmd install
npm.cmd start
```

Use `npm.cmd ci` for a clean installation following the dependency lockfile.

Start a song in Spotify Desktop. SingAlong opens the overlay immediately and searches LRCLIB for synchronized lyrics. If no matching synchronized lyrics are available, it displays “No Lyrics Available for this song”.

## Features

Want to help test a beta? Follow the [user testing checklist (Indonesian)](BETA_TESTING.md) and use its bug report template.

- Current and next lyric lines with a short fade and slide animation.
- Timeline slider with elapsed time and duration.
- Previous track, play/pause, and next track controls.
- Anchor-based overlay positioning, click-through interaction, and reduced opacity on hover.
- Independent background and lyric text colors and opacity.
- Automatic Game Mode when a fullscreen window receives focus.
- Re-sync button and a toggle to hide playback controls.
- System tray menu, custom settings toolbar, and exit confirmation.
- English and Indonesian interface languages, switchable in settings.

## Using the overlay

Click **☰** to open settings. **Background** controls panel color and opacity. **Teks** controls lyric color and opacity. Changes apply immediately. Settings and position reset when the app restarts.

Choose **English** or **Bahasa Indonesia** using the language selector. The selection is applied to the interface, tray menu, and exit dialog immediately and remembered between sessions. Song metadata and lyric content retain their original language.

Use **Position** in settings to choose a horizontal anchor (Left, Middle, Right) and a vertical anchor (Top, Middle, Bottom). Enter padding in pixels from the selected edges. Padding is disabled for centered axes, and both padding inputs are hidden when both anchors are Middle. Positions are measured from the selected monitor’s full screen edges to the visible lyric panel. Zero padding places the panel at the screen edge, including the taskbar area. To reset the position, use the restore position command in the tray menu.

| Control | Action |
| --- | --- |
| ☰ | Open settings |
| ↻ | Restart Spotify detection, playback clock, and lyric lookup |
| ⌄ / ⌃ beside re-sync | Hide or show playback controls |
| ⏮ / ⏭ | Request the previous or next Spotify track |
| ▶ / ⏸ | Resume or pause Spotify |
| Timeline slider | Request a new playback position when released |
| Ctrl + Alt + H | Hide or show the overlay without stopping synchronization |
| Ctrl + Alt + Q | Exit SingAlong immediately |

Playback buttons and seeking depend on the controls Spotify exposes to Windows. Game Mode locks playback interaction so clicks pass through to the game. Hover fading remains available.

Game Mode ends when focus returns to a regular window. Other fullscreen apps can also trigger it.

Choose a display from the **Monitor** dropdown. If it is disconnected, the overlay returns to the primary monitor. **Size** controls lyric font size (18–48 px) and panel width using sliders or numeric inputs. The next line uses 75% of the main font size. Height adapts to content while preserving the anchor; **Reset sizes** restores defaults. The tray menu also provides Hide/Show if the hotkey is unavailable.

## Closing settings and exiting

The **−** button closes settings while the overlay remains active and SingAlong stays visible in the taskbar.

The overlay power button or the taskbar's **Close window** command opens a custom “Close SingAlong?” confirmation. Choose **Yes** to exit the entire app or **No** to cancel.

To exit immediately, choose **Keluar dari SingAlong** in the tray menu or press **Ctrl + Alt + Q**. Exiting stops the Windows media helper.

## Building a Windows installer

Set the installer version in `build/config.json`.

```json
{
  "version": "0.2.0"
}
```

Then run on Windows.

```powershell
npm.cmd run build:installer
```

The x64 NSIS installer is written to:

```text
build/app/0.2.0/SingAlong-0.2.0.exe
```

Change the configured version for each new build. Versions must use canonical `major.minor.patch` format, such as `0.1.0` or `0.2.1`. An existing version directory blocks another build, including concurrent builds and retries after a failed build. After a failure, inspect `build-status.json` in that directory. To intentionally retry the same version, remove that failed output directory first.

The configured version is applied to the packaged app. The source package.json and lockfile keep their development version. Generated output is ignored by Git.

The installer uses a custom WPF interface with the SingAlong dark/lavender palette, creator credits, and a GitHub link. It supports per-user or all-users installation and an editable destination folder. All-users installation requests Windows administrator permission. The UI invokes an embedded NSIS engine silently.

The wizard renders text and icons directly and declares per-monitor DPI awareness. Building it requires the Windows .NET Framework compiler and WPF assemblies. Windows 10 version 1809 and later include a compatible .NET Framework runtime.

The NSIS engine and intermediate files are stored in the version folder's `engine/` subdirectory. Distribute the top-level `SingAlong-{version}.exe`, which contains the engine. The uninstaller retains the standard NSIS interface.

Build tools may require internet access on the first run. The current build produces an unsigned installer.

## How it works

SingAlong reads Spotify's Windows Media Control session and searches [LRCLIB](https://lrclib.net/docs) using track metadata. A local playback clock advances between Windows snapshots and reconciles playback state and timeline updates.

Seek, play, pause, previous, and next requests go through Windows media controls. Electron manages the UI, and Windows PowerShell helpers read and control the session and detect foreground fullscreen windows.

## Current limitations

- Playback detection currently targets Spotify Desktop.
- Lyric availability and timing depend on LRCLIB and the matching recording.
- Windows media updates can delay playback state and timeline changes.
- Fullscreen and Alt+Tab behavior still needs testing across different games.
- Live playback controls and synchronization need further testing with Spotify.
- Global shortcuts may be unavailable if another app uses the same combination.
- Settings and overlay position are stored for the current session only.

## Development

```powershell
npm.cmd run check
```

This checks JavaScript syntax. Spotify interaction, fullscreen behavior, and visual layout are verified separately on Windows.

| File | Purpose |
| --- | --- |
| main.js | Electron windows, settings state, shortcuts, tray, and IPC |
| preload.js | Overlay updates and interaction |
| overlay.html, overlay.css | Overlay layout and styling |
| controls.html, controls.css, controls-preload.js | Settings and custom toolbar |
| playback.js | Media snapshots, lyric requests, and playback controls |
| playback-clock.js | Local playback position |
| lyrics.js | LRCLIB search and LRC parsing |
| spotify.ps1 | Spotify session access through Windows Media Control |
| fullscreen.ps1 | Foreground fullscreen detection |
| build/config.json | Installer version |
| build/installer.js | Version validation, output reservation, and installer build |
| build/Wizard.cs, build/wizard.xaml | Custom Windows installer interface and installation flow |
| build/wizard.js, build/wizard.manifest | Wizard compilation and Windows DPI declaration |

The local lyric font is loaded from `font/Spotify-Font.ttf`. The supplied file identifies itself as Gotham Bold.

## Changelog

### Unreleased

- Monitor selection with fallback to the primary display.
- Ctrl + Alt + H and tray actions to hide/show the overlay.
- Font size and panel width controls, automatic height, and size reset.

### 0.3.1 — November 18, 2026

- Fully custom WPF installer with a frameless header, custom buttons, install scope and folder selection, progress, finish page, and cancellation dialog.
- Live text and vector graphics with per-monitor DPI awareness.
- A silent NSIS installation engine embedded once in the distributable. Intermediate files remain in the engine subfolder.
- Creator credits and GitHub links in the installer and app settings.
- Move the exit button to the overlay and use a custom localized exit confirmation.
- Reserve the final installer name until the wizard and embedded payload are ready.
- UI compilation and preview navigation were verified. Full installation still needs end-to-end testing; the uninstaller retains the standard NSIS interface.

### 0.3.0 — November 18, 2026

- Horizontal and vertical anchors with synchronized padding sliders and number inputs.
- Position the visible panel against full screen edges, with live padding updates.
- Disable padding for centered axes and hide both padding controls when both axes are centered.
- Remove dragging, Ctrl + Alt + L, automatic overlay resizing, and background blur.
- Use aligned React Icons for sync, controller visibility, and menu buttons.
- Keep settings above the overlay.

### 0.2.2 — November 18, 2026

- Embed the SingAlong icon in Windows executables, installers, uninstallers, and shortcuts.

### 0.2.1 — November 18, 2026

- Explicit transparent overlay background and automatic window height matching the panel.
- Apply the Windows Acrylic backdrop only when the blur option changes.

### 0.2.0 — November 18, 2026

- English and Indonesian localization with a saved language preference.
- Electron runtime locales limited to English and Indonesian for future installers.
- Configurable Windows installer builds with per-version output and duplicate build protection.
- Acrylic background blur on Windows 11 build 22621 or later.
- Re-sync button to restart Spotify detection, playback timing, and lyric lookup.
- Playback control visibility toggle beside re-sync.
- Metadata and timeline consistency checks during rapid track changes.
- Debounced lyric requests and validation to discard outdated responses.
- Lyric candidates restricted to a maximum duration difference of three seconds.

### 0.1.0 — November 18, 2026

- Spotify lyric overlay with current and next lines, a local font, and lyric transitions.
- Timeline slider and previous, play/pause, and next controls.
- Local playback clock for pause, resume, seeking, and track changes.
- Automatic Game Mode, click-through, hover fading, and focus recovery.
- Independent background and text color and opacity settings.
- Custom toolbar, tray integration, shortcuts, and exit confirmation.

Live synchronization, playback controls, and fullscreen Alt+Tab behavior still need further testing.

See [CHANGELOG.md](CHANGELOG.md) for the full history.

## Downloads

| No. | Release | Link |
| --- | --- | --- |
| 1 | v0.1.0 · Windows x64 | [Download installer](https://github.com/Andiilul/SingAlong/releases/download/v0.1.0/SingAlong-0.1.0.exe) |
| --- | --- | --- |
| 2 | v0.2.0 · Windows x64 | [Download installer](https://github.com/Andiilul/SingAlong/releases/download/v0.1.0/SingAlong-0.2.0.exe) |



Browse [all releases](https://github.com/Andiilul/SingAlong/releases) for release notes and other versions.
