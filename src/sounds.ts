/**
 * Synthesized alarm sounds (no audio files to load or fail).
 * Each sound schedules its nodes at audio-clock time `when` and returns them so they can be cancelled.
 * Add new entries here; the id is what will go in URLs / saved configs.
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
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
  return osc;
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
} satisfies Record<string, Sound>;

export type SoundId = keyof typeof SOUNDS;
export const DEFAULT_SOUND: SoundId = 'chime';
