import { type TimerConfig } from './config';

/** A named starting point, rendered as a link whose href is just the config's URL. */
export interface Preset {
  name: string;
  config: TimerConfig;
}

const mins = (...m: number[]) => m.map((x) => x * 60_000);

export const PRESETS: Preset[] = [
  {
    name: '🍅 Pomodoro',
    config: {
      // Three work/break pairs; every third break (the long one) is 15 minutes.
      intervals: mins(25, 5, 25, 5, 25, 15),
      names: ['Work', 'Break', 'Work', 'Break', 'Work', 'Long break'],
      sound: 'ding',
    },
  },
  {
    name: '🍞 Bread proofing',
    config: {
      intervals: mins(20, 20, 20, 30, 30, 90, 120),
      names: ['Stretch & fold', 'Stretch & fold', 'Stretch & fold', 'Stretch & fold', 'Stretch & fold', 'Bulk ferment', 'Proof'],
      sound: 'gong',
    },
  },
  {
    name: '♨️ Bread baking',
    config: {
      intervals: mins(30, 15),
      names: ['Lid on', 'Lid off'],
      sound: 'bell',
    },
  },
];
