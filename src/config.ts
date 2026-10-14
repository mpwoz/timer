import { formatDuration, parseDuration } from './duration';
import { DEFAULT_SOUND, SOUNDS, type SoundId } from './sounds';

/** Everything that defines a timer. This is what the URL (and later, saved presets) encode. */
export interface TimerConfig {
  intervals: number[]; // ms, cycled in order
  names: string[]; // per-interval label, aligned with intervals; '' means the default "Interval N"
  sound: SoundId;
}

export function isSoundId(s: string): s is SoundId {
  return Object.hasOwn(SOUNDS, s);
}

/** Human-readable summary, e.g. "15:00 → 5:00". */
export function describe(config: TimerConfig): string {
  return config.intervals.map(formatDuration).join(' → ');
}

/** Readable query string, e.g. "?t=15:00,5:00&n=Warm%20up,&s=ding". Defaults are omitted. */
export function toSearch(config: TimerConfig): string {
  let q = `?t=${config.intervals.map(formatDuration).join(',')}`;
  if (config.names.some((n) => n !== '')) q += `&n=${config.names.map(encodeURIComponent).join(',')}`;
  if (config.sound !== DEFAULT_SOUND) q += `&s=${config.sound}`;
  return q;
}

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Inverse of toSearch. Tolerates junk: bad intervals are dropped, unknown sounds fall back to the default. */
export function fromSearch(search: string): TimerConfig {
  const params = new URLSearchParams(search);
  const intervals = (params.get('t') ?? '')
    .split(',')
    .map((t) => parseDuration(t, ''))
    .filter((ms): ms is number => ms !== null);
  // Read names from the raw query: commas inside a name are percent-encoded, but
  // URLSearchParams would decode them before we could split on the real separators.
  const raw = /[?&]n=([^&]*)/.exec(search);
  const names = raw ? raw[1].split(',').map(safeDecode) : [];
  const s = params.get('s') ?? '';
  return {
    intervals,
    names: intervals.map((_, i) => names[i] ?? ''),
    sound: isSoundId(s) ? s : DEFAULT_SOUND,
  };
}
