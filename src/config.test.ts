import { describe as group, expect, it } from 'vitest';
import { describe, fromSearch, toSearch } from './config';

group('config URL', () => {
  it('round-trips', () => {
    const c = { intervals: [900_000, 300_000], sound: 'ding' as const };
    expect(toSearch(c)).toBe('?t=15:00,5:00&s=ding');
    expect(fromSearch(toSearch(c))).toEqual(c);
  });
  it('omits the default sound and handles hours', () => {
    expect(toSearch({ intervals: [5_400_000], sound: 'chime' })).toBe('?t=1:30:00');
    expect(fromSearch('?t=1:30:00')).toEqual({ intervals: [5_400_000], sound: 'chime' });
  });
  it('accepts plain minutes and tolerates junk', () => {
    expect(fromSearch('?t=7,abc,0:30&s=nope')).toEqual({ intervals: [420_000, 30_000], sound: 'chime' });
    expect(fromSearch('')).toEqual({ intervals: [], sound: 'chime' });
  });
  it('describes intervals', () => {
    expect(describe({ intervals: [450_000, 60_000], sound: 'chime' })).toBe('7:30 → 1:00');
  });
});
