const { performance } = require('node:perf_hooks');

class PlaybackClock {
  constructor() {
    this.reset();
  }

  reset() {
    this.position = 0;
    this.anchoredAt = 0;
    this.playing = false;
    this.duration = Infinity;
    this.sample = null;
  }

  read(now = performance.now()) {
    const elapsed = this.playing ? Math.max(0, now - this.anchoredAt) : 0;
    return Math.max(0, Math.min(this.duration, this.position + elapsed));
  }

  update(track, now = performance.now(), wallTime = Date.now()) {
    if (!track) {
      this.reset();
      return;
    }

    const previous = this.sample;
    const playing = Boolean(track.playing);
    const position = Number(track.position);
    const updatedAt = Number(track.updatedAt);
    this.duration = track.duration > 0 ? track.duration : Infinity;
    const valid = Number.isFinite(position) && position >= 0;
    // A repeated timeline is stale even when the playback status has changed.
    const fresh = valid && (!previous ||
      position !== previous.position || updatedAt > previous.updatedAt);
    const transition = playing !== this.playing;
    let target = this.read(now);

    if (fresh) {
      const age = Number.isFinite(updatedAt) && updatedAt > 0 ? Math.max(0, wallTime - updatedAt) : 0;
      // On resume a timeline can still refer to the moment before the pause.
      const elapsed = playing && !transition ? Math.min(age, 2000) : 0;
      const reported = position + elapsed;
      const difference = reported - target;
      if (!previous || transition || !playing || Math.abs(difference) >= 750) {
        target = reported;
      } else {
        target += difference * 0.2;
      }
    }

    this.position = Math.max(0, Math.min(this.duration, target));
    this.anchoredAt = now;
    this.playing = playing;
    if (fresh) this.sample = { position, updatedAt };
  }
}

module.exports = { PlaybackClock };
