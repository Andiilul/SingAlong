const { spawn } = require('node:child_process');
const path = require('node:path');
const { createInterface } = require('node:readline');
const { findLyrics, getLyricPair } = require('./lyrics');
const { PlaybackClock } = require('./playback-clock');

function followSpotify(publish, onFullscreenChange) {
  const helper = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'spotify.ps1'),
    '-SingAlongProcessId', String(process.pid),
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const output = createInterface({ input: helper.stdout });
  let track = null;
  let trackKey;
  let request;
  let lyrics = [];
  let status = 'waiting';
  let lastFrame;
  const clock = new PlaybackClock();
  let seeking = null;
  let lookupTimer;
  let generation = 0;

  function render() {
    const frame = getLyricPair(lyrics, clock.read());
    frame.position = Math.floor(clock.read() / 250) * 250;
    frame.duration = track?.duration ?? 0;
    frame.canSeek = Boolean(track?.canSeek && track.duration > 0);
    frame.trackKey = trackKey ?? null;
    frame.playing = Boolean(track?.playing);
    frame.controls = {
      play: Boolean(track?.canPlay), pause: Boolean(track?.canPause),
      next: Boolean(track?.canNext), previous: Boolean(track?.canPrevious),
    };
    frame.status = track ? [track.title, track.artist].filter(Boolean).join(' · ') : 'Spotify Desktop';
    if (!lyrics.length) frame.messageKey = status;
    const serialized = JSON.stringify(frame);
    if (serialized !== lastFrame) {
      lastFrame = serialized;
      publish(frame);
    }
  }

  output.on('line', async (line) => {
    let snapshot;
    try {
      snapshot = JSON.parse(line);
    } catch (error) {
      console.error('Invalid Windows media snapshot', error);
      return;
    }
    onFullscreenChange(snapshot.fullscreen);
    track = snapshot.track;
    const key = track && JSON.stringify([track.title, track.artist, track.album, track.duration]);
    if (key !== trackKey) clock.reset();
    clock.update(track);
    if (key === trackKey) {
      render();
      return;
    }
    trackKey = key;
    const version = ++generation;
    clearTimeout(lookupTimer);
    request?.abort();
    lyrics = [];
    status = track ? 'searching' : 'waiting';
    if (!snapshot.mediaAvailable) status = 'mediaError';
    render();
    if (!track) return;

    const requestedTrack = { ...track };
    lookupTimer = setTimeout(async () => {
      const { signal } = request = new AbortController();
      try {
        const result = await findLyrics(requestedTrack, signal);
        if (signal.aborted || generation !== version || trackKey !== key) return;
        lyrics = result.some((line) => line.lyric) ? result : [];
        status = 'noLyrics';
      } catch (error) {
        if (signal.aborted || generation !== version || trackKey !== key) return;
        console.error(error);
        status = 'lyricsError';
      }
      render();
    }, 650);
  });

  helper.stderr.on('data', (data) => console.error(data.toString().trim()));
  function readerFailed() {
    onFullscreenChange(false);
    generation++;
    clearTimeout(lookupTimer);
    request?.abort();
    track = null;
    trackKey = null;
    clock.reset();
    lyrics = [];
    status = 'mediaError';
    render();
  }
  helper.on('error', readerFailed);
  helper.on('exit', readerFailed);

  render();
  const timer = setInterval(render, 100);
  const stop = () => {
    generation++;
    clearTimeout(lookupTimer);
    clearInterval(timer);
    request?.abort();
    output.close();
    helper.removeListener('exit', readerFailed);
    helper.kill();
    seeking?.kill();
  };
  function runCommand(args, expectedKey, allowed) {
    return new Promise((resolve) => {
      if (!track || !allowed || expectedKey !== trackKey || seeking) {
        resolve({ ok: false, messageKey: 'unavailable' });
        return;
      }
      const child = spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'spotify.ps1'),
        ...args,
        '-ExpectedTitle', track.title, '-ExpectedArtist', track.artist ?? '',
      ], { windowsHide: true, stdio: 'ignore' });
      seeking = child;
      const timeout = setTimeout(() => child.kill(), 8000);
      const finish = (ok) => {
        clearTimeout(timeout);
        if (seeking !== child) return;
        seeking = null;
        resolve({ ok, messageKey: ok ? '' : 'commandError' });
      };
      child.once('error', () => finish(false));
      child.once('exit', (code) => finish(code === 0));
    });
  }
  stop.seek = (position, expectedKey) => runCommand(
    ['-SeekPosition', String(Math.round(position))], expectedKey,
    track?.canSeek && Number.isFinite(position) && position >= 0 && position <= track.duration,
  );
  stop.control = (action, expectedKey) => {
    const allowed = { play: track?.canPlay, pause: track?.canPause,
      next: track?.canNext, previous: track?.canPrevious };
    return runCommand(['-MediaAction', action], expectedKey, allowed[action] === true);
  };
  return stop;
}

module.exports = { followSpotify };
