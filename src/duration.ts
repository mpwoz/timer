/**
 * Parse the minutes/seconds fields into milliseconds.
 *
 * The minutes field also accepts colon forms ("7:30", "1:00:00"), in which case
 * the seconds field is ignored. Seconds may exceed 59 ("0" + "90" = 1:30).
 * Returns null for anything invalid or non-positive.
 */
export function parseDuration(minutes: string, seconds: string): number | null {
  const m = minutes.trim();
  const s = seconds.trim();

  if (m.includes(':')) {
    const parts = m.split(':');
    if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
    const total = parts.reduce((acc, p) => acc * 60 + Number(p), 0);
    return total > 0 ? total * 1000 : null;
  }

  const num = /^\d*\.?\d*$/;
  if (!num.test(m) || !num.test(s) || m === '.' || s === '.') return null;
  const total = Number(m || 0) * 60 + Number(s || 0);
  return total > 0 ? Math.round(total * 1000) : null;
}

/** Format milliseconds as m:ss or h:mm:ss, rounding up so 0:00 only shows at the end. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000 - 1e-9));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
