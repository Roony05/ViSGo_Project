/**
 * Music for the opening sequence.
 *
 * Two sources, in order:
 *
 *   1. `/audio/intro.mp3`, if the deployment ships one. This is the slot for a
 *      licensed recording — drop the file in `public/audio/` and it is used
 *      automatically, no code change. Nothing is bundled by default, because
 *      "Hello Vietnam" (Marc Lavoine / Yvan Coriat, 2006) is in copyright and
 *      neither a recording of it nor a synthesised rendition of its melody can
 *      ship with this repo. Licence it, then fill the slot.
 *
 *   2. Otherwise an original cue, synthesised here at runtime. It is written in
 *      điệu Bắc — the five-tone scale most Vietnamese folk melody sits in — and
 *      shaped to the scene it plays under: sparse and low while the sky is
 *      still night, opening as the sun clears the ridge, resolving under the
 *      title card. Zero bytes to download and it can never fail to load.
 *
 * The whole cue is `INTRO_MS` long either way, and stops the moment the intro
 * is skipped.
 */

/** Where a licensed recording goes. Absent by default. */
const TRACK_URL = '/audio/intro.mp3';

/** Remembered across visits: someone who silenced this means it. */
const MUTE_KEY = 'visgo_intro_muted_v1';

export function isIntroMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setIntroMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* Private browsing. The preference just will not survive the tab. */
  }
}

/* ------------------------------------------------------------------ */
/* The score                                                           */
/* ------------------------------------------------------------------ */

/**
 * Điệu Bắc on C — hò, xự, xang, xê, cống.
 *
 * The scale that makes this sound Vietnamese rather than merely wistful is the
 * one it leaves out: no third above the second degree and no leading tone, so
 * nothing ever pulls toward a Western cadence.
 */
const SCALE = [261.63, 293.66, 349.23, 392.0, 440.0]; // C4 D4 F4 G4 A4

/** `degree` may run past the scale; it wraps up an octave each time. */
function pitch(degree: number): number {
  const octave = Math.floor(degree / SCALE.length);
  return SCALE[((degree % SCALE.length) + SCALE.length) % SCALE.length] * 2 ** octave;
}

interface Note {
  /** Seconds from the start of the cue. */
  at: number;
  /** Scale degree; 0 is C4, 5 is C5, -5 is C3. */
  degree: number;
  /** Peak gain, before the master envelope. */
  gain: number;
  /** Seconds until it has decayed to silence. */
  decay: number;
}

/**
 * The melody, in three phrases that track the picture above them.
 *
 * Written out rather than generated: twelve seconds is short enough that every
 * note is a decision, and a generator would only hide which ones.
 */
function buildScore(durationSec: number): Note[] {
  const notes: Note[] = [];
  /** The sequence is authored against 12s; a different length rescales it. */
  const k = durationSec / 12;
  const add = (at: number, degree: number, gain: number, decay: number) =>
    notes.push({ at: at * k, degree, gain, decay: decay * k });

  // Phrase 1 — night. Single plucks over the drone, room between them.
  add(0.35, 7, 0.22, 2.6);
  add(1.55, 9, 0.18, 2.2);
  add(2.6, 8, 0.2, 2.4);
  add(3.5, 6, 0.16, 2.0);

  // Phrase 2 — the sun clears the ridge. The line starts climbing and the
  // notes start touching each other.
  add(4.35, 5, 0.24, 2.4);
  add(5.0, 7, 0.24, 2.2);
  add(5.6, 8, 0.26, 2.2);
  add(6.2, 9, 0.28, 2.6);
  add(6.95, 11, 0.26, 2.4);
  add(7.55, 10, 0.24, 2.4);

  // Phrase 3 — the title card. Falls back to the tonic and stays there.
  add(8.3, 12, 0.3, 3.0);
  add(8.95, 10, 0.24, 2.6);
  add(9.5, 9, 0.24, 2.8);
  add(10.15, 7, 0.26, 3.2);
  add(10.9, 5, 0.3, 3.6); // hò, an octave up — the resolve

  return notes;
}

/**
 * A plucked string, roughly a đàn tranh.
 *
 * Two detuned triangles through a lowpass that closes as the note decays: a
 * plucked string loses its upper partials first, and skipping that is most of
 * what makes a synthesised pluck sound like a beep.
 */
function pluck(ctx: BaseAudioContext, out: AudioNode, freq: number, at: number, gain: number, decay: number): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 6, 7000), at);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.4, 200), at + decay);
  filter.Q.value = 0.8;
  filter.connect(out);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.012); // the attack transient
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  env.connect(filter);

  for (const detune of [-4, 4]) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(env);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/**
 * The bed under the melody: a fifth, held for the whole cue.
 *
 * It is what carries the night-to-dawn feeling; the plucks are only what
 * happens on top of it.
 */
function drone(ctx: BaseAudioContext, out: AudioNode, start: number, duration: number): void {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(0.09, start + 2.2);
  env.gain.setValueAtTime(0.09, start + duration * 0.62);
  env.gain.exponentialRampToValueAtTime(0.13, start + duration * 0.78); // swells under the title
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  env.connect(out);

  for (const freq of [pitch(-5), pitch(-2), pitch(0)]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(env);
    osc.start(start);
    osc.stop(start + duration + 0.1);
  }
}

/**
 * Schedules the whole cue onto any audio context, live or offline.
 *
 * Split out from playback so the composition can be rendered and measured in a
 * test without a speaker, which is the only way to check that a change to the
 * score did not leave a phrase silent.
 */
export function renderIntroCue(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startAt: number,
  durationSec: number,
): void {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.exponentialRampToValueAtTime(0.9, startAt + 0.9); // fade in under the first frames
  master.gain.setValueAtTime(0.9, startAt + durationSec - 1.4);
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec); // and out under the wipe
  master.connect(destination);

  drone(ctx, master, startAt, durationSec);
  for (const n of buildScore(durationSec)) {
    pluck(ctx, master, pitch(n.degree), startAt + n.at, n.gain, n.decay);
  }
}

/* ------------------------------------------------------------------ */
/* Playback                                                            */
/* ------------------------------------------------------------------ */

export interface IntroMusic {
  /** True once sound is actually coming out — autoplay may have been refused. */
  readonly playing: boolean;
  /** Retry after a user gesture, which is what unblocks autoplay. */
  resume: () => Promise<boolean>;
  /** Fade out over `seconds` and release everything. */
  stop: (seconds?: number) => void;
}

/**
 * Starts the cue, preferring a licensed file when one is deployed.
 *
 * Autoplay is refused by default in every current browser when the page has
 * had no interaction, and a first visit is exactly that case. So this reports
 * whether it actually started rather than assuming; the caller offers a button
 * when it did not, and `resume()` is what that button calls.
 */
export function playIntroMusic(durationMs: number): IntroMusic {
  const AudioCtxClass: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  let ctx: AudioContext | null = null;
  let element: HTMLAudioElement | null = null;
  let elementGain: GainNode | null = null;
  let stopped = false;
  let playing = false;

  const durationSec = durationMs / 1000;

  const startSynth = (): void => {
    if (!AudioCtxClass || stopped) return;
    if (!ctx) ctx = new AudioCtxClass();
    renderIntroCue(ctx, ctx.destination, ctx.currentTime + 0.05, durationSec);
    playing = true;
  };

  /**
   * The licensed-file path.
   *
   * Routed through the same AudioContext as the synth so the tail fade is one
   * piece of code, and so a track longer than the intro is faded rather than
   * cut off mid-note.
   */
  const startFile = (): void => {
    if (!AudioCtxClass || stopped) return;
    if (!ctx) ctx = new AudioCtxClass();

    element = new Audio(TRACK_URL);
    element.crossOrigin = 'anonymous';
    element.loop = false;

    const src = ctx.createMediaElementSource(element);
    elementGain = ctx.createGain();
    const now = ctx.currentTime;
    elementGain.gain.setValueAtTime(0.0001, now);
    elementGain.gain.exponentialRampToValueAtTime(0.85, now + 1.0);
    elementGain.gain.setValueAtTime(0.85, now + durationSec - 1.4);
    elementGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    src.connect(elementGain);
    elementGain.connect(ctx.destination);

    void element.play().then(
      () => {
        playing = true;
      },
      () => {
        playing = false;
      },
    );
  };

  /** Does a licensed track exist at this deployment? One HEAD, no download. */
  const start = (): void => {
    if (!AudioCtxClass) return;
    fetch(TRACK_URL, { method: 'HEAD' })
      .then((r) => {
        if (stopped) return;
        if (r.ok && (r.headers.get('content-type') ?? '').includes('audio')) startFile();
        else startSynth();
      })
      .catch(() => {
        // Offline, or the dev server answering 404 with an HTML page.
        if (!stopped) startSynth();
      });
  };

  start();

  return {
    get playing() {
      return playing;
    },
    async resume() {
      if (stopped) return false;
      try {
        if (!ctx) {
          start();
        } else if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        if (element && element.paused) await element.play();
        playing = true;
        return true;
      } catch {
        return false;
      }
    },
    stop(seconds = 0.4) {
      if (stopped) return;
      stopped = true;
      playing = false;
      const audioCtx = ctx;
      if (element) {
        // Ramp before pausing: cutting a waveform mid-cycle is an audible click.
        if (elementGain && audioCtx) {
          const now = audioCtx.currentTime;
          elementGain.gain.cancelScheduledValues(now);
          elementGain.gain.setValueAtTime(Math.max(elementGain.gain.value, 0.0001), now);
          elementGain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
        }
        const el = element;
        window.setTimeout(() => {
          el.pause();
          el.src = '';
        }, seconds * 1000);
      }
      if (audioCtx) {
        window.setTimeout(() => {
          void audioCtx.close().catch(() => undefined);
        }, seconds * 1000 + 80);
      }
      ctx = null;
      element = null;
      elementGain = null;
    },
  };
}
