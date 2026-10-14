import { describe, expect, it } from 'vitest';
import { formatDuration, parseDuration } from './duration';
import { Schedule, Stopwatch } from './schedule';

describe('parseDuration', () => {
  it('combines minutes and seconds', () => {
    expect(parseDuration('7', '30')).toBe(450_000);
    expect(parseDuration('', '45')).toBe(45_000);
    expect(parseDuration('5', '')).toBe(300_000);
    expect(parseDuration('0', '90')).toBe(90_000);
    expect(parseDuration('1.5', '')).toBe(90_000);
  });
  it('accepts colon forms in the minutes field', () => {
    expect(parseDuration('7:30', 'ignored')).toBe(450_000);
    expect(parseDuration('1:00:00', '')).toBe(3_600_000);
  });
  it('rejects junk and zero', () => {
    expect(parseDuration('', '')).toBeNull();
    expect(parseDuration('0', '0')).toBeNull();
    expect(parseDuration('abc', '')).toBeNull();
    expect(parseDuration('1:x', '')).toBeNull();
    expect(parseDuration('-1', '')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('rounds up to whole seconds', () => {
    expect(formatDuration(450_000)).toBe('7:30');
    expect(formatDuration(449_001)).toBe('7:30');
    expect(formatDuration(1)).toBe('0:01');
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });
});

describe('Schedule', () => {
  const s = new Schedule([900, 300]);

  it('tracks position through cycles', () => {
    expect(s.position(0)).toEqual({ index: 0, remaining: 900, completed: 0 });
    expect(s.position(1000)).toEqual({ index: 1, remaining: 200, completed: 1 });
    expect(s.position(1200)).toEqual({ index: 0, remaining: 900, completed: 2 });
    expect(s.position(2150)).toEqual({ index: 1, remaining: 250, completed: 3 });
  });

  it('lists boundaries in (from, to]', () => {
    expect(s.boundaries(0, 900)).toEqual([900]);
    expect(s.boundaries(900, 1200)).toEqual([1200]);
    expect(s.boundaries(0, 3000)).toEqual([900, 1200, 2100, 2400]);
    expect(s.boundaries(1300, 2000)).toEqual([]);
    expect(s.boundaries(5, 5)).toEqual([]);
  });

  it('rejects empty or non-positive intervals', () => {
    expect(() => new Schedule([])).toThrow();
    expect(() => new Schedule([0])).toThrow();
  });
});

describe('Stopwatch', () => {
  it('excludes paused time', () => {
    let t = 1000;
    const w = new Stopwatch(() => t);
    w.start();
    t += 500;
    w.pause();
    t += 10_000;
    expect(w.elapsed()).toBe(500);
    w.resume();
    t += 250;
    expect(w.elapsed()).toBe(750);
    w.stop();
    expect(w.elapsed()).toBe(0);
  });
});
