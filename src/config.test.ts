import { describe as group, expect, it } from 'vitest';
import { describe, fromSearch, toSearch } from './config';

group('config URL', () => {
  it('round-trips', () => {
    const c = { intervals: [900_000, 300_000], names: ['', ''], sound: 'ding' as const };
    expect(toSearch(c)).toBe('?t=15:00,5:00&s=ding');
    expect(fromSearch(toSearch(c))).toEqual(c);
  });
  it('omits the default sound and handles hours', () => {
    expect(toSearch({ intervals: [5_400_000], names: [''], sound: 'chime' })).toBe('?t=1:30:00');
    expect(fromSearch('?t=1:30:00')).toEqual({ intervals: [5_400_000], names: [''], sound: 'chime' });
  });
  it('accepts plain minutes and tolerates junk', () => {
    expect(fromSearch('?t=7,abc,0:30&s=nope')).toEqual({ intervals: [420_000, 30_000], names: ['', ''], sound: 'chime' });
    expect(fromSearch('')).toEqual({ intervals: [], names: [], sound: 'chime' });
  });
  it('round-trips interval names, including commas and spaces', () => {
    const c = { intervals: [600_000, 120_000], names: ['Warm, up', ''], sound: 'chime' as const };
    expect(toSearch(c)).toBe('?t=10:00,2:00&n=Warm%2C%20up,');
    expect(fromSearch(toSearch(c))).toEqual(c);
  });
  it('pads names to match the intervals', () => {
    expect(fromSearch('?t=1:00,2:00&n=Focus')).toEqual({
      intervals: [60_000, 120_000],
      names: ['Focus', ''],
      sound: 'chime',
    });
  });
  it('describes intervals', () => {
    expect(describe({ intervals: [450_000, 60_000], names: ['', ''], sound: 'chime' })).toBe('7:30 → 1:00');
  });
});
