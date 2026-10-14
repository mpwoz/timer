import './style.css';
import { AlarmScheduler } from './alarm';
import { describe, fromSearch, isSoundId, toSearch, type TimerConfig } from './config';
import { formatDuration } from './duration';
import { RowList } from './rows';
import { Schedule, Stopwatch } from './schedule';
import { DEFAULT_SOUND, SOUNDS, type SoundId } from './sounds';

const HORIZON_MS = 3 * 60_000; // how far ahead sounds are queued on the audio clock
const TICK_MS = 100;
const RING_FLASH_MS = 2000;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const display = el<HTMLDivElement>('display');
const statusLine = el<HTMLDivElement>('status');
const form = el<HTMLFormElement>('form');
const soundPicker = el<HTMLFieldSetElement>('sounds');
const addBtn = el<HTMLButtonElement>('add');
const pauseBtn = el<HTMLButtonElement>('pause');
const stopBtn = el<HTMLButtonElement>('stop');

const watch = new Stopwatch();
const alarm = new AlarmScheduler();
const rows = new RowList(el('rows'), onEdit);
let active: { config: TimerConfig; schedule: Schedule; rows: HTMLElement[] } | null = null;
let queuedUntil = 0; // elapsed ms up to which sounds have been queued
let lastElapsed = 0;
let ringTimeout: number | undefined;

function selectedSound(): SoundId {
  const value = soundPicker.querySelector<HTMLInputElement>('input:checked')?.value ?? '';
  return isSoundId(value) ? value : DEFAULT_SOUND;
}

/** The config described by the inputs, or null (with the offending rows) if it isn't valid. */
function readConfig(): { config: TimerConfig | null; used: HTMLElement[]; invalid: HTMLElement[] } {
  const { intervals, used, invalid } = rows.read();
  const ok = intervals.length > 0 && invalid.length === 0;
  return { config: ok ? { intervals, sound: selectedSound() } : null, used, invalid };
}

/** Inputs changed: keep the URL bookmarkable and the idle display current. */
function onEdit(): void {
  const { config } = readConfig();
  if (config) history.replaceState(null, '', toSearch(config));
  render();
}

function start(): void {
  const { config, used, invalid } = readConfig();
  if (!config) return rejectInput(invalid.length ? invalid : rows.rows);
  alarm.unlock();
  alarm.cancelAll();
  active = { config, schedule: new Schedule(config.intervals), rows: used };
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
  rows.focus();
}

function onSoundPicked(): void {
  const sound = selectedSound();
  alarm.unlock();
  alarm.playNow(sound);
  if (active && watch.state !== 'idle') {
    // Requeue upcoming alarms with the new sound.
    active.config.sound = sound;
    alarm.cancelAll();
    queuedUntil = watch.elapsed();
  }
  onEdit();
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
    const { config } = readConfig();
    display.textContent = formatDuration(config?.intervals[0] ?? 0);
    statusLine.textContent = config && config.intervals.length > 1 ? describe(config) : '';
    document.title = config ? `${describe(config)} · Timer` : 'Timer';
    pauseBtn.textContent = 'Pause';
    highlight(null);
    return;
  }

  const { remaining, completed, index } = active.schedule.position(watch.elapsed());
  const n = active.config.intervals.length;
  const time = formatDuration(remaining);
  const paused = state === 'paused' ? 'Paused · ' : '';
  display.textContent = time;
  statusLine.textContent = `${paused}${n > 1 ? `interval ${index + 1} of ${n} · ` : ''}round ${Math.floor(completed / n) + 1}`;
  document.title = `${state === 'paused' ? '⏸ ' : ''}${time} · ${describe(active.config)}`;
  pauseBtn.textContent = state === 'paused' ? 'Resume' : 'Pause';
  highlight(active.rows[index] ?? null);
}

function highlight(row: HTMLElement | null): void {
  for (const r of rows.rows) r.classList.toggle('current', r === row);
}

function rejectInput(bad: HTMLElement[]): void {
  for (const row of bad) {
    row.classList.remove('invalid');
    void row.offsetWidth; // restart the animation
    row.classList.add('invalid');
  }
  rows.focus(bad[0]);
}

// --- setup ---

for (const [id, sound] of Object.entries(SOUNDS)) {
  const label = document.createElement('label');
  label.innerHTML = `<input type="radio" name="sound" value="${id}" /><span>${sound.label}</span>`;
  // Mouse picks shouldn't steal focus from the inputs; arrow keys still work once tabbed in.
  label.addEventListener('mousedown', (e) => e.preventDefault());
  soundPicker.append(label);
}

const initial = fromSearch(location.search);
soundPicker.querySelector<HTMLInputElement>(`input[value="${initial.sound}"]`)!.checked = true;
rows.set(initial.intervals);

// --- wiring ---

form.addEventListener('submit', (e) => {
  e.preventDefault();
  start();
});

// Click fires for mouse, label clicks and arrow-key selection, so every pick previews.
soundPicker.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).matches('input')) onSoundPicked();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (watch.state === 'idle') rows.focus();
    else stop();
  } else if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    togglePause();
  }
});

addBtn.addEventListener('click', () => rows.focus(rows.add()));
pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stop);
// Keep keyboard focus in the inputs when buttons are clicked/tapped.
for (const btn of document.querySelectorAll('button')) {
  btn.addEventListener('mousedown', (e) => e.preventDefault());
}

document.addEventListener('visibilitychange', tick);
window.setInterval(tick, TICK_MS);
render();
rows.focus();
