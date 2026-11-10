# MyWorkout

An iPhone web app (PWA) to plan and track workouts with bodyweight, a pull-up bar, dumbbells,
an EZ bar, a cable pulley and a flat/incline bench. No server and no account: data stays on the
phone (localStorage), with a JSON backup you can export.

Live: https://hopeyoudiequick.github.io/MyWorkout/

## Features

- **Plans**: exercises with sets, reps, rest and notes, assigned to days of the week.
- **Workout**: session timer (keeps running with the app closed, can be paused), tick off each
  set, rest timer with a sound, a note per exercise (e.g. the weight) and what you noted last time.
- **Summary**: duration, sets done, skipped exercises, planned areas you didn't train, a muscle
  map of the session and the areas still untrained in the last 7 days.
- **History**: hours per week, month and in total, plus muscles trained in the last 30 days.
- **Exercises**: 347 exercises with an animated demo (tap the thumbnail for full screen, with
  speed control), instructions, a YouTube link and your own reference video (embedded YouTube link).

## Run it on the Mac

```bash
cd ~/Desktop/Apps/MyWorkout && python3 -m http.server 8765
```

Then open http://localhost:8765.

## Install it on the iPhone

Open the live URL in **Safari**, tap **Share → Add to Home Screen**. Open it once with a
connection so it can cache the images; after that it works offline.

After pushing an update to `main`, GitHub Pages redeploys in about a minute and the app picks
up the new version the next time it is opened online.

## Rebuilding the catalogue

`data.js` and `img/` are generated from free-exercise-db by `tools/build_catalog.py`
(icons: `tools/make_icons.py`). See `LICENSES.md` for licences.
