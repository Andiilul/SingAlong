const { ipcRenderer } = require('electron');
let wasInGameMode = false;
let gameNoticeTimer;
let scrubbing = false;
let seekPending = false;
let currentTrackKey = null;
let scrubTrackKey = null;
let canSeek = false;
let playbackControls = {};
let playbackPlaying = false;
let controlPending = false;
let translations = {};
let messageKey = '';
const t = key => translations[key] ?? key;
function showMessage(key) {
  messageKey = key;
  document.querySelector('#seek-message').textContent = t(key);
}

function updatePlaybackButtons() {
  const play = document.querySelector('#play-pause');
  const action = playbackPlaying ? 'pause' : 'play';
  play.textContent = playbackPlaying ? '⏸' : '▶';
  play.title = t(playbackPlaying ? 'pause' : 'play');
  play.setAttribute('aria-label', play.title);
  play.disabled = wasInGameMode || controlPending || !playbackControls[action];
  document.querySelector('#previous-track').disabled = wasInGameMode || controlPending || !playbackControls.previous;
  document.querySelector('#next-track').disabled = wasInGameMode || controlPending || !playbackControls.next;
}

function formatTime(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

window.addEventListener('DOMContentLoaded', () => {
  const lyrics = document.querySelector('main');
  new ResizeObserver(() => {
    const { left, top, right, bottom } = lyrics.getBoundingClientRect();
    ipcRenderer.send('lyrics-bounds', { left, top, right, bottom });
  }).observe(lyrics, { box: 'border-box' });

  const menu = document.querySelector('#settings-menu');
  menu.addEventListener('mouseenter', () => ipcRenderer.send('overlay-menu-hover', true));
  menu.addEventListener('mouseleave', () => ipcRenderer.send('overlay-menu-hover', false));
  menu.addEventListener('click', () => ipcRenderer.send('open-settings'));
  const exit = document.querySelector('#exit-overlay');
  exit.addEventListener('mouseenter', () => ipcRenderer.send('overlay-menu-hover', true));
  exit.addEventListener('mouseleave', () => ipcRenderer.send('overlay-menu-hover', false));
  exit.addEventListener('click', () => ipcRenderer.send('exit-overlay'));
  const resync = document.querySelector('#resync');
  resync.addEventListener('mouseenter', () => ipcRenderer.send('overlay-menu-hover', true));
  resync.addEventListener('mouseleave', () => ipcRenderer.send('overlay-menu-hover', false));
  resync.addEventListener('click', async () => {
    resync.disabled = true;
    try {
      const restarted = await ipcRenderer.invoke('resync-spotify');
      if (restarted) {
        scrubbing = false;
        showMessage('resyncStarted');
      }
    } catch {
      showMessage('resyncError');
    } finally {
      setTimeout(() => { resync.disabled = wasInGameMode; }, 2000);
    }
  });
  const buttons = document.querySelector('.playback-buttons');
  buttons.addEventListener('mouseenter', () => ipcRenderer.send('overlay-menu-hover', true));
  buttons.addEventListener('mouseleave', () => ipcRenderer.send('overlay-menu-hover', false));
  for (const [id, action] of [['previous-track', 'previous'], ['play-pause', 'toggle'], ['next-track', 'next']]) {
    document.getElementById(id).addEventListener('click', async () => {
      controlPending = true;
      updatePlaybackButtons();
      try {
        const command = action === 'toggle' ? (playbackPlaying ? 'pause' : 'play') : action;
        const result = await ipcRenderer.invoke('control-spotify', command, currentTrackKey);
        showMessage(result.messageKey ?? '');
      } catch {
        showMessage('controlError');
      } finally {
        controlPending = false;
        updatePlaybackButtons();
      }
    });
  }
  const timeline = document.querySelector('.timeline');
  const toggleController = document.querySelector('#toggle-controller');
  toggleController.addEventListener('mouseenter', () => ipcRenderer.send('overlay-menu-hover', true));
  toggleController.addEventListener('mouseleave', () => ipcRenderer.send('overlay-menu-hover', false));
  toggleController.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('controller-hidden');
    const label = t(hidden ? 'showControls' : 'hideControls');
    toggleController.title = label;
    toggleController.setAttribute('aria-label', label);
    toggleController.setAttribute('aria-expanded', String(!hidden));
    if (hidden) {
      scrubbing = false;
      showMessage('');
    }
  });
  timeline.addEventListener('mouseenter', () => ipcRenderer.send('overlay-menu-hover', true));
  timeline.addEventListener('mouseleave', () => {
    if (!scrubbing) ipcRenderer.send('overlay-menu-hover', false);
  });
  const slider = document.querySelector('#seek');
  slider.addEventListener('input', () => {
    if (!scrubbing) scrubTrackKey = currentTrackKey;
    scrubbing = true;
    document.querySelector('#elapsed').textContent = formatTime(slider.valueAsNumber);
  });
  slider.addEventListener('change', async () => {
    const position = slider.valueAsNumber;
    const key = scrubTrackKey;
    scrubbing = false;
    seekPending = true;
    slider.disabled = true;
    showMessage('seeking');
    try {
      const result = await ipcRenderer.invoke('seek-spotify', position, key);
      showMessage(result.messageKey ?? '');
    } catch {
      showMessage('seekError');
    } finally {
      seekPending = false;
      slider.disabled = !canSeek || wasInGameMode;
      ipcRenderer.send('overlay-menu-hover', timeline.matches(':hover'));
    }
  });
  slider.addEventListener('pointercancel', () => {
    scrubbing = false;
    ipcRenderer.send('overlay-menu-hover', false);
  });
});

ipcRenderer.on('lyrics-hover', (_event, hovered) => {
  document.body.classList.toggle('lyrics-hovered', hovered);
});

ipcRenderer.on('overlay-state', (_event, { gameMode, fontSize, backgroundOpacity, textOpacity, textColor, reduceOpacityOnHover, backgroundColor, language, translations: messages }) => {
  translations = messages;
  document.documentElement.lang = language;
  document.querySelector('#game-notice strong').textContent = t('gameMode');
  document.querySelector('#game-notice p').textContent = t('gameSubtitle');
  for (const [id, key] of [['exit-overlay', 'exit'], ['settings-menu', 'openSettings'], ['resync', 'resync'], ['previous-track', 'previous'], ['next-track', 'next'], ['seek', 'position'], ['toggle-controller', document.body.classList.contains('controller-hidden') ? 'showControls' : 'hideControls']]) {
    const element = document.getElementById(id);
    element.title = t(key);
    element.setAttribute('aria-label', t(key));
  }
  updatePlaybackButtons();
  showMessage(messageKey);
  const alpha = (value) => Math.round(Math.max(0, Math.min(100, value)) / 100 * 255).toString(16).padStart(2, '0');
  const style = document.documentElement.style;
  style.setProperty('--lyric-font-size', `${fontSize}px`);
  style.setProperty('--overlay-background', `${backgroundColor}${alpha(backgroundOpacity)}`);
  style.setProperty('--lyrics-color', `${textColor}${alpha(textOpacity)}`);
  style.setProperty('--lyrics-next-color', `${textColor}${alpha(textOpacity * 0.72)}`);
  style.setProperty('--overlay-hover-opacity', reduceOpacityOnHover ? 0.35 : 1);

  if (gameMode !== wasInGameMode) {
    wasInGameMode = gameMode;
    updatePlaybackButtons();
    const notice = document.querySelector('#game-notice');
    notice.hidden = !gameMode;
    document.querySelector('#settings-menu').disabled = gameMode;
    document.querySelector('#exit-overlay').disabled = gameMode;
    document.querySelector('#resync').disabled = gameMode;
    document.querySelector('#seek').disabled = gameMode || !canSeek || seekPending;
    clearTimeout(gameNoticeTimer);
    if (gameMode) gameNoticeTimer = setTimeout(() => { notice.hidden = true; }, 3200);
  }
});

ipcRenderer.on('lyrics', (_event, { status, current, next, instrumental = false, position = 0, duration = 0, canSeek: seekable, trackKey, playing, controls = {} }) => {
  playbackPlaying = Boolean(playing);
  playbackControls = controls;
  updatePlaybackButtons();
  document.querySelector('.status').textContent = status;
  for (const [selector, text] of [['.current', current], ['.next', next]]) {
    const element = document.querySelector(selector);
    const showNote = selector === '.current' && instrumental;
    if (element.textContent === text && element.classList.contains('instrumental') === showNote) continue;
    for (const animation of element.getAnimations()) animation.cancel();
    element.textContent = text;
    element.classList.toggle('instrumental', showNote);
    if (showNote) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-label', '♪');
      svg.setAttribute('role', 'img');
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', 'M9 18V5l12-2v13M9 9l12-2M9 18c0 1.66-1.79 3-4 3s-4-1.34-4-3 1.79-3 4-3 4 1.34 4 3Zm12-2c0 1.66-1.79 3-4 3s-4-1.34-4-3 1.79-3 4-3 4 1.34 4 3Z');
      svg.append(path);
      element.append(svg);
    }
    if ((text || showNote) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.animate([
        { opacity: 0, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 200, easing: 'ease-out' });
    }
  }
  if (trackKey !== currentTrackKey) {
    scrubbing = false;
    showMessage('');
  }
  currentTrackKey = trackKey;
  canSeek = Boolean(seekable);
  const slider = document.querySelector('#seek');
  slider.disabled = !canSeek || wasInGameMode || seekPending;
  if (!scrubbing) {
    slider.max = Math.max(1, duration);
    slider.value = Math.min(position, duration);
    document.querySelector('#elapsed').textContent = formatTime(position);
  }
  document.querySelector('#duration').textContent = formatTime(duration);
});
