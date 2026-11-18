const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, screen, Tray } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { followSpotify } = require('./playback');

const editShortcut = 'CommandOrControl+Alt+L';
const quitShortcut = 'CommandOrControl+Alt+Q';
const overlaySettings = {
  reduceOpacityOnHover: true,
  backgroundOpacity: 78,
  backgroundBlur: false,
  textOpacity: 100,
  textColor: '#ffffff',
  backgroundColor: '#0e0f16',
  allowClickThrough: true,
};

app.whenReady().then(async () => {
  const backgroundBlurSupported = process.platform === 'win32' &&
    Number(os.release().split('.')[2]) >= 22621;
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  const overlayWidth = Math.min(680, width);
  const overlayHeight = 242;
  const overlay = new BrowserWindow({
    x: x + Math.round((width - overlayWidth) / 2),
    y: y + height - overlayHeight - 40,
    width: overlayWidth,
    height: overlayHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    icon: path.join(__dirname, 'singalong-icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

  let controls = null;
  let quitting = false;
  let confirmingClose = false;
  let editing = false;
  let gameMode = false;
  let overMenu = false;
  let lyricsBounds;
  let overLyrics = false;
  let drag = null;
  const focusRecoveryTimers = new Set();
  let fullscreenEndedAt = 0;

  function recoverOverlayFocus() {
    const fromFullscreen = gameMode || Date.now() - fullscreenEndedAt < 2000;
    for (const timer of focusRecoveryTimers) clearTimeout(timer);
    focusRecoveryTimers.clear();
    // Windows can complete a fullscreen composition change after activation.
    for (const delay of [0, 150, 600, 1200]) {
      const timer = setTimeout(() => {
        focusRecoveryTimers.delete(timer);
        if (quitting || overlay.isDestroyed()) return;
        if (fromFullscreen && delay === 600 && !confirmingClose && !controls?.isFocused()) {
          // Re-present the transparent HWND after the fullscreen swapchain releases the display.
          overlay.hide();
          overlay.showInactive();
        }
        keepOverlayOnTop();
        overlay.webContents.invalidate();
      }, delay);
      focusRecoveryTimers.add(timer);
    }
  }
  overlay.on('focus', recoverOverlayFocus);
  overlay.on('restore', recoverOverlayFocus);

  function keepOverlayOnTop() {
    if (quitting || overlay.isDestroyed()) return;
    overlay.setAlwaysOnTop(true, 'screen-saver');
    if (!overlay.isVisible()) overlay.showInactive();
    if (!confirmingClose && !controls?.isFocused()) overlay.moveTop();
  }

  function moveOverlay(x, y, display) {
    const area = display.workArea;
    const bounds = overlay.getBounds();
    const boundedX = Math.max(area.x, Math.min(x, area.x + area.width - bounds.width));
    const boundedY = Math.max(area.y, Math.min(y, area.y + area.height - bounds.height));
    if (boundedX !== bounds.x || boundedY !== bounds.y) overlay.setPosition(boundedX, boundedY);
  }

  function revealOverlay() {
    const bounds = overlay.getBounds();
    moveOverlay(bounds.x, bounds.y, screen.getDisplayMatching(bounds));
    keepOverlayOnTop();
  }

  ipcMain.on('overlay-drag', (event, active) => {
    if (event.sender !== overlay.webContents || !editing) return;
    drag = active === true ? { cursor: screen.getCursorScreenPoint(), bounds: overlay.getBounds() } : null;
  });
  overlay.on('blur', () => { drag = null; });

  function updateCursor() {
    if (drag) {
      const cursor = screen.getCursorScreenPoint();
      const x = drag.bounds.x + cursor.x - drag.cursor.x;
      const y = drag.bounds.y + cursor.y - drag.cursor.y;
      moveOverlay(x, y, screen.getDisplayNearestPoint(cursor));
      return;
    }
    updateCursorHover();
  }

  ipcMain.on('lyrics-bounds', (event, bounds) => {
    if (event.sender === overlay.webContents) lyricsBounds = bounds;
  });

  function updateCursorHover() {
    let hovered = false;
    if (lyricsBounds && !editing && overlaySettings.reduceOpacityOnHover) {
      const cursor = screen.getCursorScreenPoint();
      const origin = overlay.getContentBounds();
      const x = cursor.x - origin.x;
      const y = cursor.y - origin.y;
      const { left, top, right, bottom } = lyricsBounds;
      hovered = x >= left && x < right && y >= top && y < bottom;
    }
    if (hovered === overLyrics) return;
    overLyrics = hovered;
    overlay.webContents.send('lyrics-hover', hovered);
  }

  function applyMouseMode() {
    const ignore = gameMode || (!editing && !overMenu && overlaySettings.allowClickThrough);
    overlay.setIgnoreMouseEvents(ignore, { forward: true });
  }

  function applyOverlayState() {
    applyMouseMode();
    if (backgroundBlurSupported) {
      overlay.setBackgroundMaterial(overlaySettings.backgroundBlur ? 'acrylic' : 'none');
    }
    overlay.webContents.send('overlay-state', { ...overlaySettings, editing, gameMode });
    updateCursorHover();
  }

  function setGameMode(active) {
    if (active === gameMode || overlay.isDestroyed()) return;
    if (!active) fullscreenEndedAt = Date.now();
    gameMode = active;
    if (active) {
      editing = false;
      drag = null;
      overMenu = false;
    }
    applyOverlayState();
    keepOverlayOnTop();
    if (!active && overlay.isFocused()) recoverOverlayFocus();
  }

  ipcMain.on('overlay-menu-hover', (event, hovered) => {
    if (event.sender !== overlay.webContents || typeof hovered !== 'boolean') return;
    overMenu = hovered;
    applyMouseMode();
  });

  async function confirmExit(window, event) {
    if (quitting) return;
    event.preventDefault();
    if (confirmingClose) return;

    confirmingClose = true;
    try {
      const { response } = await dialog.showMessageBox(window, {
        type: 'question',
        title: 'SingAlong',
        message: 'Close SingAlong?',
        buttons: ['Yes', 'No'],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      });
      if (response === 0) app.quit();
    } catch (error) {
      console.error(error);
    } finally {
      confirmingClose = false;
    }
  }
  overlay.on('close', (event) => void confirmExit(overlay, event));

  async function openSettings() {
    if (controls) {
      if (!controls.webContents.isLoading()) controls.show();
      return;
    }

    const window = new BrowserWindow({
      width: 400,
      height: 640,
      useContentSize: true,
      frame: false,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      backgroundColor: '#15141e',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'controls-preload.js'),
      },
    });
    controls = window;
    window.on('close', (event) => void confirmExit(window, event));
    window.on('closed', () => { controls = null; });
    try {
      await window.loadFile(path.join(__dirname, 'controls.html'));
      window.webContents.send('settings-state', { ...overlaySettings, backgroundBlurSupported });
      window.show();
    } catch (error) {
      if (!window.isDestroyed()) window.destroy();
      console.error(error);
    }
  }

  ipcMain.on('open-settings', (event) => {
    if (event.sender === overlay.webContents) void openSettings();
  });

  ipcMain.on('update-overlay-setting', (event, name, value) => {
    if (event.sender !== controls?.webContents) return;
    if (['backgroundOpacity', 'textOpacity'].includes(name) && Number.isInteger(value) && value >= 0 && value <= 100) {
      overlaySettings[name] = value;
    } else if (['backgroundColor', 'textColor'].includes(name) && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      overlaySettings[name] = value;
    } else if (name === 'backgroundBlur' && typeof value === 'boolean' && backgroundBlurSupported) {
      overlaySettings.backgroundBlur = value;
    } else if ((name === 'allowClickThrough' || name === 'reduceOpacityOnHover') && typeof value === 'boolean') {
      overlaySettings[name] = value;
    } else {
      return;
    }
    applyOverlayState();
  });

  ipcMain.on('dismiss-settings', (event) => {
    if (event.sender === controls?.webContents && !confirmingClose) controls.destroy();
  });

  ipcMain.on('close-settings', (event) => {
    if (event.sender === controls?.webContents) controls.close();
  });

  await overlay.loadFile(path.join(__dirname, 'overlay.html'));
  const tray = new Tray(path.join(__dirname, 'singalong-icon.png'));
  tray.setToolTip('SingAlong');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Buka pengaturan', click: openSettings },
    { label: 'Pulihkan posisi overlay', click: () => {
      const area = screen.getPrimaryDisplay().workArea;
      const { width, height } = overlay.getBounds();
      drag = null;
      moveOverlay(area.x + Math.round((area.width - width) / 2),
        area.y + area.height - height - 40, screen.getPrimaryDisplay());
      revealOverlay();
    } },
    { type: 'separator' },
    { label: 'Keluar dari SingAlong', click: () => app.quit() },
  ]));
  tray.on('click', openSettings);
  app.once('will-quit', () => tray.destroy());

  const editShortcutAvailable = globalShortcut.register(editShortcut, () => {
    drag = null;
    if (!gameMode) editing = !editing;
    applyOverlayState();
    revealOverlay();
  });
  if (!editShortcutAvailable) {
    editing = true;
    console.warn('Ctrl+Alt+L is unavailable. The overlay will open in drag mode.');
  }

  if (!globalShortcut.register(quitShortcut, () => app.quit())) {
    console.warn('Ctrl+Alt+Q is unavailable. Stop the app from the terminal.');
  }

  applyOverlayState();
  const publishPlayback = (frame) => {
    if (!overlay.isDestroyed()) overlay.webContents.send('lyrics', frame);
  };
  let stopPlayback = followSpotify(publishPlayback, setGameMode);
  let lastResync = 0;
  ipcMain.handle('resync-spotify', (event) => {
    if (event.sender !== overlay.webContents || quitting || gameMode) return false;
    if (Date.now() - lastResync < 2000) return false;
    lastResync = Date.now();
    stopPlayback();
    stopPlayback = followSpotify(publishPlayback, setGameMode);
    return true;
  });
  ipcMain.handle('seek-spotify', (event, position, trackKey) => {
    if (event.sender !== overlay.webContents || gameMode) return { ok: false, message: 'Keluar dari Mode Game untuk mengubah posisi.' };
    return stopPlayback.seek(position, trackKey);
  });
  ipcMain.handle('control-spotify', (event, action, trackKey) => {
    if (event.sender !== overlay.webContents || gameMode) return { ok: false, message: 'Keluar dari Mode Game untuk mengontrol Spotify.' };
    if (!['play', 'pause', 'next', 'previous'].includes(action)) return { ok: false, message: 'Perintah tidak tersedia.' };
    return stopPlayback.control(action, trackKey);
  });
  app.once('before-quit', () => {
    quitting = true;
    stopPlayback();
    ipcMain.removeHandler('seek-spotify');
    ipcMain.removeHandler('control-spotify');
    ipcMain.removeHandler('resync-spotify');
  });
  overlay.showInactive();
  keepOverlayOnTop();
  // Fullscreen transitions can reorder topmost windows after focus has changed.
  const topmostTimer = setInterval(keepOverlayOnTop, 500);
  overlay.on('blur', keepOverlayOnTop);
  screen.on('display-metrics-changed', revealOverlay);
  screen.on('display-removed', revealOverlay);
  app.once('before-quit', () => {
    clearInterval(topmostTimer);
    for (const timer of focusRecoveryTimers) clearTimeout(timer);
    focusRecoveryTimers.clear();
    screen.removeListener('display-metrics-changed', revealOverlay);
    screen.removeListener('display-removed', revealOverlay);
  });
  const cursorTimer = setInterval(updateCursor, 32);
  overlay.on('closed', () => {
    clearInterval(topmostTimer);
    for (const timer of focusRecoveryTimers) clearTimeout(timer);
    focusRecoveryTimers.clear();
    clearInterval(cursorTimer);
    if (!quitting) app.quit();
  });
}).catch((error) => {
  console.error(error);
  app.exit(1);
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
