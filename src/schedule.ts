/**
 * Pure timing math for a repeating sequence of intervals (all in ms).
 * A single repeating timer is just `[ms]`; "15m then 5m" is `[900000, 300000]`.
 */
export class Schedule {
  readonly cycleLength: number;

  constructor(readonly intervals: number[]) {
    if (intervals.length === 0 || intervals.some((i) => !(i > 0))) {
      throw new Error('Schedule needs at least one positive interval');
    }
    this.cycleLength = intervals.reduce((a, b) => a + b, 0);
  }

  /** Where we are after `elapsed` ms: current interval index, ms left in it, intervals completed so far. */
  position(elapsed: number): { index: number; remaining: number; completed: number } {
    const cycles = Math.floor(elapsed / this.cycleLength);
    let within = elapsed - cycles * this.cycleLength;
    for (let i = 0; i < this.intervals.length; i++) {
      if (within < this.intervals[i]) {
        return { index: i, remaining: this.intervals[i] - within, completed: cycles * this.intervals.length + i };
      }
      within -= this.intervals[i];
    }
    // Floating-point edge: treat as start of the next cycle.
    return { index: 0, remaining: this.intervals[0], completed: (cycles + 1) * this.intervals.length };
  }

  /** Elapsed times of interval boundaries in the half-open range (from, to]. */
  boundaries(from: number, to: number): number[] {
    const out: number[] = [];
    if (to <= from) return out;
    const cycles = Math.floor(from / this.cycleLength);
    let t = cycles * this.cycleLength;
    let i = 0;
    while (t <= to) {
      t += this.intervals[i];
      i = (i + 1) % this.intervals.length;
      if (t > from && t <= to) out.push(t);
    }
    return out;
  }
}

export type TimerState = 'idle' | 'running' | 'paused';

/** Tracks elapsed time with pause/resume. `now` is injectable for tests (defaults to performance.now). */
export class Stopwatch {
  state: TimerState = 'idle';
  private anchor = 0; // clock time at which elapsed was 0 (while running)
  private frozen = 0; // elapsed while paused

  constructor(private now: () => number = () => performance.now()) {}

  elapsed(): number {
    if (this.state === 'running') return this.now() - this.anchor;
    return this.frozen;
  }

  start(): void {
    this.anchor = this.now();
    this.frozen = 0;
    this.state = 'running';
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.frozen = this.elapsed();
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.anchor = this.now() - this.frozen;
    this.state = 'running';
  }

  stop(): void {
    this.frozen = 0;
    this.state = 'idle';
  }
}
