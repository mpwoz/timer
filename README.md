# timer

A keyboard-first repeating timer. Type `7` <kbd>Tab</kbd> `30` <kbd>Enter</kbd> for a 7:30 timer that chimes and restarts forever.

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> | start / restart with the current values |
| <kbd>Space</kbd> | pause / resume |
| <kbd>Esc</kbd> | stop |

The minutes field also takes `7:30` or `1:00:00`.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # -> dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(repo Settings → Pages → Source: **GitHub Actions**).

## Layout

- `src/schedule.ts` – pure timing math. Already models a *list* of intervals cycled in order.
- `src/alarm.ts` – queues sounds on the Web Audio clock ahead of time, so background-tab
  throttling can't make the alarm late.
- `src/sounds.ts` – synthesized sounds registry (add entries for a sound picker).
- `src/duration.ts` – parse/format durations.
- `src/main.ts` – UI wiring. `TimerConfig` is the serializable shape for URLs/presets.
