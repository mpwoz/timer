import './style.css';
import { AlarmScheduler } from './alarm';
import { formatDuration, parseDuration } from './duration';
import { Schedule, Stopwatch } from './schedule';
import { DEFAULT_SOUND, type SoundId } from './sounds';

/**
 * Everything that defines a timer. Kept plain and serializable: this is what
 * URL params and saved presets will encode later.
 */
export interface TimerConfig {
  intervals: number[]; // ms, cycled in order
  sound: SoundId;
}

const HORIZON_MS = 3 * 60_000; // how far ahead sounds are queued on the audio clock
const TICK_MS = 100;
const RING_FLASH_MS = 2000;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const display = el<HTMLDivElement>('display');
const statusLine = el<HTMLDivElement>('status');
const form = el<HTMLFormElement>('form');
const minInput = el<HTMLInputElement>('min');
const secInput = el<HTMLInputElement>('sec');
const pauseBtn = el<HTMLButtonElement>('pause');
const stopBtn = el<HTMLButtonElement>('stop');

const watch = new Stopwatch();
const alarm = new AlarmScheduler();
let active: { config: TimerConfig; schedule: Schedule } | null = null;
let queuedUntil = 0; // elapsed ms up to which sounds have been queued
let lastElapsed = 0;
let ringTimeout: number | undefined;

function readConfig(): TimerConfig | null {
  const ms = parseDuration(minInput.value, secInput.value);
  return ms ? { intervals: [ms], sound: DEFAULT_SOUND } : null;
}

function start(): void {
  const config = readConfig();
  if (!config) return rejectInput();
  alarm.unlock();
  alarm.cancelAll();
  active = { config, schedule: new Schedule(config.intervals) };
  watch.start();
  queuedUntil = 0;
  lastElapsed = 0;
  tick();
}

function togglePause(): void {
  if (watch.state === 'running') {
    watch.pause();
    alarm.cancelAll();
    queuedUntil = watch.elapsed();
  } else if (watch.state === 'paused') {
    alarm.unlock();
    watch.resume();
  }
  tick();
}

function stop(): void {
  watch.stop();
  alarm.cancelAll();
  active = null;
  render();
  focusInputs();
}

function tick(): void {
  if (active && watch.state === 'running') {
    const { schedule, config } = active;
    const elapsed = watch.elapsed();

    if (schedule.boundaries(lastElapsed, elapsed).length > 0) onIntervalEnd();
    lastElapsed = elapsed;

    if (alarm.drifted()) {
      alarm.cancelAll();
      queuedUntil = elapsed;
    }
    const horizon = elapsed + HORIZON_MS;
    if (horizon > queuedUntil) {
      const now = performance.now();
      for (const b of schedule.boundaries(Math.max(queuedUntil, elapsed), horizon)) {
        alarm.schedule(now + (b - elapsed), config.sound);
      }
      queuedUntil = horizon;
    }
    alarm.prune(performance.now());
  }
  render();
}

/** Runs (possibly late, if the tab is throttled) after each interval ends. The sound itself is already queued. */
function onIntervalEnd(): void {
  document.body.classList.add('ring');
  clearTimeout(ringTimeout);
  ringTimeout = window.setTimeout(() => document.body.classList.remove('ring'), RING_FLASH_MS);
  // Future: desktop notification here.
}

function render(): void {
  const state = watch.state;
  document.body.dataset.state = state;

  if (!active || state === 'idle') {
    const ms = parseDuration(minInput.value, secInput.value);
    display.textContent = formatDuration(ms ?? 0);
    statusLine.textContent = '';
    document.title = 'Timer';
    pauseBtn.textContent = 'Pause';
    return;
  }

  const { remaining, completed } = active.schedule.position(watch.elapsed());
  const time = formatDuration(remaining);
  const every = active.config.intervals.map(formatDuration).join(' → ');
  display.textContent = time;
  statusLine.textContent = `${state === 'paused' ? 'Paused · ' : ''}every ${every} · round ${completed + 1}`;
  document.title = `${state === 'paused' ? '⏸ ' : ''}${time} · Timer`;
  pauseBtn.textContent = state === 'paused' ? 'Resume' : 'Pause';
}

function rejectInput(): void {
  form.classList.remove('invalid');
  void form.offsetWidth; // restart the animation
  form.classList.add('invalid');
  focusInputs();
}

function focusInputs(): void {
  minInput.focus();
  minInput.select();
}

// --- wiring ---

form.addEventListener('submit', (e) => {
  e.preventDefault();
  start();
});

for (const input of [minInput, secInput]) {
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => watch.state === 'idle' && render());
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (watch.state === 'idle') focusInputs();
    else stop();
  } else if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    togglePause();
  }
});

pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stop);
// Keep keyboard focus in the inputs when buttons are clicked/tapped.
for (const btn of document.querySelectorAll('button')) {
  btn.addEventListener('mousedown', (e) => e.preventDefault());
}

document.addEventListener('visibilitychange', tick);
window.setInterval(tick, TICK_MS);
render();
focusInputs();
