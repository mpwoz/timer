import { SOUNDS, type SoundId } from './sounds';

/**
 * Schedules alarm sounds on the Web Audio clock, ahead of time.
 *
 * Browsers throttle JS timers in background tabs (Chrome: up to once per minute),
 * but the audio clock isn't throttled, so sounds queued here play on time even
 * if the page's JS is asleep. Times are given in performance.now() milliseconds.
 */
export class AlarmScheduler {
  private ctx: AudioContext | null = null;
  private pending: { at: number; nodes: AudioScheduledSourceNode[] }[] = [];
  private offset = 0; // audio clock (s) minus performance clock (s) when we last scheduled

  /** Must be called from a user gesture (keypress/click) so the browser allows audio. */
  unlock(): void {
    this.ctx ??= new AudioContext();
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  schedule(at: number, sound: SoundId): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.offset = this.currentOffset(ctx);
    const when = Math.max(ctx.currentTime, at / 1000 + this.offset);
    this.pending.push({ at, nodes: SOUNDS[sound].play(ctx, when) });
  }

  /** Play immediately (e.g. to preview a sound). */
  playNow(sound: SoundId): void {
    if (this.ctx) SOUNDS[sound].play(this.ctx, this.ctx.currentTime);
  }

  cancelAll(): void {
    for (const p of this.pending) for (const n of p.nodes) n.stop();
    this.pending = [];
  }

  /** Drop sounds that have already played. */
  prune(now: number): void {
    this.pending = this.pending.filter((p) => p.at > now - 5000);
  }

  /**
   * True if the audio clock has slipped relative to wall time since we scheduled
   * (e.g. the context was suspended by sleep or an OS audio interruption).
   * The caller should then cancel and reschedule.
   */
  drifted(): boolean {
    if (!this.ctx || this.pending.length === 0) return false;
    return Math.abs(this.currentOffset(this.ctx) - this.offset) > 0.05;
  }

  private currentOffset(ctx: AudioContext): number {
    // getOutputTimestamp pairs the two clocks precisely; currentTime alone is quantized.
    const ts = ctx.getOutputTimestamp?.();
    if (ts?.contextTime !== undefined && ts.performanceTime) {
      return ts.contextTime - ts.performanceTime / 1000;
    }
    return ctx.currentTime - performance.now() / 1000;
  }
}
