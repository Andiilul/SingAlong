const { app, BrowserWindow, globalShortcut, ipcMain, Menu, screen, shell, Tray } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const languages = { en: require('./locales/en.json'), id: require('./locales/id.json') };
const { followSpotify } = require('./playback');
const { moveWindow, resizeWindow } = require('./window-position');

const quitShortcut = 'CommandOrControl+Alt+Q';
const overlaySettings = {
  reduceOpacityOnHover: true,
  backgroundOpacity: 78,
  textOpacity: 100,
  textColor: '#ffffff',
  backgroundColor: '#0e0f16',
  allowClickThrough: true,
  horizontalAnchor: 'middle',
  verticalAnchor: 'bottom',
  horizontalPadding: 40,
  verticalPadding: 40,
  monitorId: null,
  fontSize: 26,
  panelWidth: 680,
};

app.whenReady().then(async () => {
  const languageFile = path.join(app.getPath('userData'), 'language.json');
  let language = app.getLocale().startsWith('id') ? 'id' : 'en';
  try {
    const saved = JSON.parse(fs.readFileSync(languageFile, 'utf8'));
    if (Object.hasOwn(languages, saved.language)) language = saved.language;
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not load language preference');
  }
  const t = (key) => languages[language][key] ?? languages.en[key] ?? key;
  const localizationState = () => ({ language, translations: languages[language] });
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  const overlayWidth = Math.min(680, width);
  const overlayHeight = 242;
  const overlay = new BrowserWindow({
    x: x + Math.round((width - overlayWidth) / 2),
    y: y + height - overlayHeight - 40,
    width: overlayWidth,
    height: overlayHeight,
    frame: false,
    thickFrame: false,
    movable: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    // Native sizing is controlled by settings; will-resize blocks manual resizing.
    resizable: true,
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
  overlay.on('will-resize', (event) => event.preventDefault());

  overlaySettings.monitorId = String(screen.getPrimaryDisplay().id);
  let overlayHidden = false;
  let hideShortcutAvailable = false;
  let requestedSize = '';
  let controls = null;
  let quitting = false;
  let confirmingClose = false;
  let gameMode = false;
  let overMenu = false;
  let lyricsBounds;
  let overLyrics = false;
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
        if (quitting || overlay.isDestroyed() || overlayHidden) return;
        if (fromFullscreen && delay === 600 && !confirmingClose && !controls?.isVisible()) {
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
    if (quitting || overlay.isDestroyed() || overlayHidden) return;
    overlay.setAlwaysOnTop(true, 'screen-saver');
    if (!overlay.isVisible()) overlay.showInactive();
    if (confirmingClose) return;
    if (controls?.isVisible()) {
      controls.moveTop();
    } else {
      overlay.moveTop();
    }
  }

  function selectedDisplay() {
    const display = screen.getAllDisplays().find(item => String(item.id) === overlaySettings.monitorId) ?? screen.getPrimaryDisplay();
    overlaySettings.monitorId = String(display.id);
    return display;
  }

  function sizeLimits() {
    const maxWidth = Math.max(1, selectedDisplay().bounds.width);
    return { minWidth: Math.min(320, maxWidth), maxWidth };
  }

  function syncOverlaySize() {
    const display = selectedDisplay();
    const limits = sizeLimits();
    overlaySettings.panelWidth = Math.max(limits.minWidth, Math.min(overlaySettings.panelWidth, limits.maxWidth));
    const width = overlaySettings.panelWidth + 12;
    const height = Math.max(80, Math.ceil((lyricsBounds?.bottom ?? 236) + 6));
    const signature = `${width}:${height}:${display.id}:${display.scaleFactor}`;
    if (requestedSize === signature) return;
    requestedSize = signature;
    resizeWindow(overlay, width, height);
  }

  function toggleOverlay() {
    if (confirmingClose) return;
    overlayHidden = !overlayHidden;
    if (overlayHidden) overlay.hide();
    else revealOverlay();
    updateTrayLanguage();
  }

  function positionLimits() {
    const area = selectedDisplay().bounds;
    const bounds = overlay.getBounds();
    const panelWidth = lyricsBounds ? lyricsBounds.right - lyricsBounds.left : bounds.width;
    const panelHeight = lyricsBounds ? lyricsBounds.bottom - lyricsBounds.top : bounds.height;
    return {
      horizontalPadding: Math.max(0, Math.floor(area.width - panelWidth)),
      verticalPadding: Math.max(0, Math.floor(area.height - panelHeight)),
    };
  }

  function applyPosition() {
    const area = selectedDisplay().bounds;
    const limits = positionLimits();
    function offset(anchor, padding, space) {
      if (anchor === 'middle') return Math.round(space / 2);
      const inset = Math.min(padding, space);
      return anchor === 'right' || anchor === 'bottom' ? space - inset : inset;
    }
    const bounds = overlay.getBounds();
    const content = overlay.getContentBounds();
    const panelX = (lyricsBounds?.left ?? 0) + content.x - bounds.x;
    const panelY = (lyricsBounds?.top ?? 0) + content.y - bounds.y;
    const x = area.x + offset(overlaySettings.horizontalAnchor, overlaySettings.horizontalPadding, limits.horizontalPadding) - panelX;
    const y = area.y + offset(overlaySettings.verticalAnchor, overlaySettings.verticalPadding, limits.verticalPadding) - panelY;
    if (x !== bounds.x || y !== bounds.y) moveWindow(overlay, x, y);
  }

  function settingsState() {
    return { ...overlaySettings, positionLimits: positionLimits(), sizeLimits: sizeLimits(), hideShortcutAvailable,
      monitors: screen.getAllDisplays().map(display => ({ id: String(display.id), label: display.label,
        width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor),
        primary: display.id === screen.getPrimaryDisplay().id })), ...localizationState() };
  }

  function revealOverlay() {
    // Move onto the target display before converting the requested size to physical pixels.
    applyPosition();
    syncOverlaySize();
    applyPosition();
    if (controls && !controls.webContents.isLoading()) controls.webContents.send('settings-state', settingsState());
    keepOverlayOnTop();
  }

  ipcMain.on('lyrics-bounds', (event, bounds) => {
    if (event.sender !== overlay.webContents ||
        !bounds || !['left', 'top', 'right', 'bottom'].every(key => Number.isFinite(bounds[key]))) return;
    lyricsBounds = bounds;
    syncOverlaySize();
    applyPosition();
    if (controls && !controls.webContents.isLoading()) controls.webContents.send('settings-state', settingsState());
  });

  function updateCursorHover() {
    let hovered = false;
    if (lyricsBounds && overlaySettings.reduceOpacityOnHover) {
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
    const ignore = gameMode || (!overMenu && overlaySettings.allowClickThrough);
    overlay.setIgnoreMouseEvents(ignore, { forward: true });
  }

  function applyOverlayState() {
    syncOverlaySize();
    applyMouseMode();
    overlay.webContents.send('overlay-state', { ...overlaySettings, gameMode, ...localizationState() });
    updateCursorHover();
  }

  function setGameMode(active) {
    if (active === gameMode || overlay.isDestroyed()) return;
    if (!active) fullscreenEndedAt = Date.now();
    gameMode = active;
    if (active) {
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
      const confirmed = await new Promise((resolve, reject) => {
        const confirmation = new BrowserWindow({
          parent: controls?.isVisible() ? controls : window,
          modal: true,
          frame: false,
          width: 400,
          height: 220,
          resizable: false,
          maximizable: false,
          fullscreenable: false,
          skipTaskbar: true,
          backgroundColor: '#15141e',
          show: false,
          webPreferences: { preload: path.join(__dirname, 'confirm-preload.js') },
        });
        confirmation.setAlwaysOnTop(true, 'screen-saver');
        let accepted = false;
        const respond = (event, answer) => {
          if (event.sender !== confirmation.webContents || typeof answer !== 'boolean') return;
          accepted = answer;
          confirmation.close();
        };
        ipcMain.on('confirm-exit-result', respond);
        confirmation.once('closed', () => {
          ipcMain.removeListener('confirm-exit-result', respond);
          resolve(accepted);
        });
        confirmation.loadFile(path.join(__dirname, 'confirm.html')).then(() => {
          if (confirmation.isDestroyed()) return;
          confirmation.webContents.send('confirmation-language', localizationState());
          confirmation.show();
        }).catch(error => {
          reject(error);
          if (!confirmation.isDestroyed()) confirmation.destroy();
        });
      });
      if (confirmed) app.quit();
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
      parent: overlay,
      alwaysOnTop: true,
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
    window.setAlwaysOnTop(true, 'screen-saver');
    controls = window;
    window.on('close', (event) => void confirmExit(window, event));
    window.on('closed', () => { controls = null; });
    try {
      await window.loadFile(path.join(__dirname, 'controls.html'));
      window.webContents.send('settings-state', settingsState());
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
    } else if ((name === 'horizontalAnchor' && ['left', 'middle', 'right'].includes(value)) ||
        (name === 'verticalAnchor' && ['top', 'middle', 'bottom'].includes(value))) {
      overlaySettings[name] = value;
    } else if (['horizontalPadding', 'verticalPadding'].includes(name) && Number.isInteger(value) && value >= 0 && value <= 10000) {
      overlaySettings[name] = Math.min(value, positionLimits()[name]);
    } else if (name === 'monitorId' && screen.getAllDisplays().some(display => String(display.id) === value)) {
      overlaySettings.monitorId = value;
      applyPosition();
      requestedSize = '';
    } else if (name === 'fontSize' && Number.isInteger(value) && value >= 18 && value <= 48) {
      overlaySettings.fontSize = value;
    } else if (name === 'panelWidth' && Number.isInteger(value) && value >= sizeLimits().minWidth && value <= sizeLimits().maxWidth) {
      overlaySettings.panelWidth = value;
    } else if (['backgroundColor', 'textColor'].includes(name) && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      overlaySettings[name] = value;
    } else if ((name === 'allowClickThrough' || name === 'reduceOpacityOnHover') && typeof value === 'boolean') {
      overlaySettings[name] = value;
    } else {
      return;
    }
    applyOverlayState();
    applyPosition();
    controls.webContents.send('settings-state', settingsState());
  });

  ipcMain.on('reset-overlay-size', (event) => {
    if (event.sender !== controls?.webContents) return;
    overlaySettings.fontSize = 26;
    overlaySettings.panelWidth = 680;
    applyOverlayState();
    revealOverlay();
  });

  ipcMain.on('dismiss-settings', (event) => {
    if (event.sender === controls?.webContents && !confirmingClose) controls.destroy();
  });

  ipcMain.on('exit-overlay', (event) => {
    if (event.sender === overlay.webContents) overlay.close();
  });

  ipcMain.on('open-github-credit', (event) => {
    if (event.sender === controls?.webContents) {
      void shell.openExternal('https://github.com/Andiilul').catch(console.error);
    }
  });

  await overlay.loadFile(path.join(__dirname, 'overlay.html'));
  if (!app.isPackaged && process.argv.includes('--devtools')) {
    overlay.webContents.openDevTools({ mode: 'detach' });
  }
  const tray = new Tray(path.join(__dirname, 'singalong-icon.png'));
  tray.setToolTip('SingAlong');
  function updateTrayLanguage() {
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: t('openSettings'), click: openSettings },
      { label: t(overlayHidden ? 'showOverlay' : 'hideOverlay'), click: toggleOverlay },
      { label: t('recoverPosition'), click: () => {
        overlayHidden = false;
        updateTrayLanguage();
        overlaySettings.horizontalAnchor = 'middle';
        overlaySettings.verticalAnchor = 'bottom';
        overlaySettings.verticalPadding = 40;
        revealOverlay();
      } },
      { type: 'separator' },
      { label: t('exit'), click: () => app.quit() },
    ]));
  }
  updateTrayLanguage();
  tray.on('click', openSettings);
  app.once('will-quit', () => tray.destroy());

  if (!globalShortcut.register(quitShortcut, () => app.quit())) {
    console.warn('Ctrl+Alt+Q is unavailable. Stop the app from the terminal.');
  }

  hideShortcutAvailable = globalShortcut.register('CommandOrControl+Alt+H', toggleOverlay);
  applyOverlayState();
  let lastPlaybackFrame;
  const publishPlayback = (frame) => {
    lastPlaybackFrame = frame;
    if (!overlay.isDestroyed()) overlay.webContents.send('lyrics', {
      ...frame, current: frame.messageKey ? t(frame.messageKey) : frame.current,
    });
  };
  ipcMain.handle('set-language', (event, value) => {
    if (event.sender !== controls?.webContents || !Object.hasOwn(languages, value)) return false;
    try {
      fs.mkdirSync(path.dirname(languageFile), { recursive: true });
      fs.writeFileSync(languageFile + '.tmp', JSON.stringify({ language: value }));
      fs.renameSync(languageFile + '.tmp', languageFile);
    } catch {
      return false;
    }
    language = value;
    applyOverlayState();
    if (lastPlaybackFrame) publishPlayback(lastPlaybackFrame);
    controls.webContents.send('settings-state', settingsState());
    updateTrayLanguage();
    return true;
  });
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
    if (event.sender !== overlay.webContents || gameMode) return { ok: false, messageKey: 'gameControlLocked' };
    return stopPlayback.seek(position, trackKey);
  });
  ipcMain.handle('control-spotify', (event, action, trackKey) => {
    if (event.sender !== overlay.webContents || gameMode) return { ok: false, messageKey: 'gameControlLocked' };
    if (!['play', 'pause', 'next', 'previous'].includes(action)) return { ok: false, messageKey: 'unavailable' };
    return stopPlayback.control(action, trackKey);
  });
  app.once('before-quit', () => {
    quitting = true;
    stopPlayback();
    ipcMain.removeHandler('seek-spotify');
    ipcMain.removeHandler('control-spotify');
    ipcMain.removeHandler('resync-spotify');
    ipcMain.removeHandler('set-language');
  });
  applyPosition();
  overlay.showInactive();
  keepOverlayOnTop();
  // Fullscreen transitions can reorder topmost windows after focus has changed.
  const topmostTimer = setInterval(keepOverlayOnTop, 500);
  overlay.on('blur', keepOverlayOnTop);
  screen.on('display-metrics-changed', revealOverlay);
  screen.on('display-removed', revealOverlay);
  screen.on('display-added', revealOverlay);
  app.once('before-quit', () => {
    clearInterval(topmostTimer);
    for (const timer of focusRecoveryTimers) clearTimeout(timer);
    focusRecoveryTimers.clear();
    screen.removeListener('display-metrics-changed', revealOverlay);
    screen.removeListener('display-removed', revealOverlay);
    screen.removeListener('display-added', revealOverlay);
  });
  const cursorTimer = setInterval(updateCursorHover, 32);
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
