# timer

A keyboard-first repeating timer. Type `7` <kbd>Tab</kbd> `30` <kbd>Enter</kbd> for a 7:30 timer that chimes and restarts forever.

| Key | Action |
| --- | --- |
| <kbd>+</kbd> | add an interval row after the current one |
| <kbd>Backspace</kbd> | (in an empty row) remove it |
| <kbd>Enter</kbd> | start / restart with the current values |
| <kbd>Space</kbd> | pause / resume |
| <kbd>Esc</kbd> | stop (or, when already stopped, reset to a blank timer) |

The minutes field also takes `7:30` or `1:00:00`. Multiple rows cycle in order (e.g. 15:00 then 5:00, repeat);
the current row is highlighted while running. Pick a sound from the row of options (each previews when picked;
Tab to it and use arrow keys).

The config lives in the URL, so bookmarks just work: `?t=15:00,5:00&s=ding` (`t` also accepts plain minutes, e.g. `t=25,5`).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # -> dist/
```

### Viewing it in a browser (incl. Playwright / automated agents)

Always load the app from the Vite dev server (`npm run dev`), **not** from a
`file://` path or a plain static file server:

- Playwright blocks the `file://` protocol outright.
- `index.html` loads `src/main.ts` as an ES module. A static server (e.g.
  `python -m http.server`) serves `.ts` with the wrong MIME type, so the browser
  refuses the module and the page renders as dead, unstyled HTML with no working
  buttons. Vite transpiles the TS on the fly, so the module loads correctly.

So: run `npm run dev`, then open the exact `Local:` URL it prints. Vite starts on
`http://localhost:5173` but **falls back to the next free port** (5174, …) if that
one is taken — read the port from the server output rather than assuming 5173.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(repo Settings → Pages → Source: **GitHub Actions**).

## Layout

- `src/schedule.ts` – pure timing math. A *list* of intervals cycled in order.
- `src/alarm.ts` – queues sounds on the Web Audio clock ahead of time, so background-tab
  throttling can't make the alarm late.
- `src/sounds.ts` – synthesized sounds registry (add entries for a sound picker).
- `src/duration.ts` – parse/format durations.
- `src/main.ts` – UI wiring. `TimerConfig` is the serializable shape for URLs/presets.
