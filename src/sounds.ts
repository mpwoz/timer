/**
 * Synthesized alarm sounds (no audio files to load or fail).
 * Each sound schedules its nodes at audio-clock time `when` and returns them so they can be cancelled.
 * Add new entries here; the id is what goes in the URL. The picker is generated from this list.
 */
export interface Sound {
  label: string;
  play(ctx: AudioContext, when: number): AudioScheduledSourceNode[];
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number, peak: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
  return osc;
}

/** Struck metal: inharmonic partials with a long decay. `length` scales the decay times. */
function struck(ctx: AudioContext, when: number, base: number, length: number, peak: number) {
  return [
    [1, 1, 2.5],
    [2.0, 0.5, 1.8],
    [2.76, 0.33, 1.2],
    [5.4, 0.17, 0.6],
  ].map(([ratio, gain, dur]) => tone(ctx, base * ratio, when, dur * length, peak * gain));
}

export const SOUNDS = {
  chime: {
    label: 'Chime',
    play(ctx, when) {
      const nodes: AudioScheduledSourceNode[] = [];
      for (let r = 0; r < 3; r++) {
        const t = when + r * 0.6;
        nodes.push(tone(ctx, 880, t, 0.5, 0.35));
        nodes.push(tone(ctx, 1318.5, t + 0.15, 0.6, 0.3));
      }
      return nodes;
    },
  },
  bell: {
    label: 'Bell',
    play: (ctx, when) => struck(ctx, when, 523.25, 1, 0.3),
  },
  gong: {
    label: 'Gong',
    // Lower and longer than the bell; low tones sound quieter, so a little more gain.
    play: (ctx, when) => struck(ctx, when, 196, 1.8, 0.4),
  },
  ding: {
    label: 'Ding',
    play(ctx, when) {
      return [tone(ctx, 1318.5, when, 0.8, 0.22), tone(ctx, 2637, when, 0.3, 0.05)];
    },
  },
  beep: {
    label: 'Beep',
    play(ctx, when) {
      return [tone(ctx, 1000, when, 0.09, 0.2, 'triangle'), tone(ctx, 1000, when + 0.15, 0.09, 0.2, 'triangle')];
    },
  },
  tap: {
    label: 'Tap',
    play(ctx, when) {
      return [tone(ctx, 1600, when, 0.06, 0.25)];
    },
  },
} satisfies Record<string, Sound>;

export type SoundId = keyof typeof SOUNDS;
export const DEFAULT_SOUND: SoundId = 'chime';
