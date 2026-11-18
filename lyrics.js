const { net } = require('electron');

function parseLyrics(text) {
  const lines = [];
  const offset = Number(text.match(/^\[offset:\s*([+-]?\d+)\]/im)?.[1] ?? 0);
  for (const line of text.split(/\r?\n/)) {
    const timestamps = [...line.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!timestamps.length) continue;
    const last = timestamps.at(-1);
    const lyric = line.slice(last.index + last[0].length).trim();
    for (const [, min, sec, fraction = ''] of timestamps) {
      const time = Number(min) * 60000 + Number(sec) * 1000 + Number(fraction.padEnd(3, '0'));
      lines.push({ time: time - offset, lyric });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

async function findLyrics(track, signal) {
  const url = new URL('https://lrclib.net/api/search');
  url.searchParams.set('track_name', track.title);
  if (track.artist) url.searchParams.set('artist_name', track.artist);
  const response = await net.fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    headers: { 'User-Agent': `SingAlong/${require('./package.json').version}` },
  });
  if (!response.ok) throw new Error(`LRCLIB HTTP ${response.status}`);

  const normalize = (value) => (value ?? '').normalize('NFKC').trim().toLowerCase();
  const results = (await response.json())
    .filter((item) => item.syncedLyrics && normalize(item.trackName) === normalize(track.title))
    .filter((item) => !track.duration || Math.abs(item.duration * 1000 - track.duration) <= 3000);
  const score = (item) => {
    const albumMismatch = Number(normalize(item.albumName) !== normalize(track.album));
    return track.duration ? Math.abs(item.duration * 1000 - track.duration) + albumMismatch : albumMismatch;
  };
  const match = results.sort((a, b) => score(a) - score(b))[0];
  return match ? parseLyrics(match.syncedLyrics) : [];
}

function getLyricPair(lines, position) {
  const next = lines.findIndex((line) => line.time > position);
  const current = (next === -1 ? lines.length : next) - 1;
  return {
    current: lines[current]?.lyric ?? '',
    next: lines.slice(current + 1).find((line) => line.lyric)?.lyric ?? '',
  };
}

module.exports = { findLyrics, getLyricPair };
