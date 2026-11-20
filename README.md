# Rack & Share

An interactive prototype of the Smart Station: a screen on a squat rack, paired with the lifter's phone. The screen tells anyone nearby whether the lifter is mid-set or resting, how long the rack stays busy, and whether they share it.

Live demo: https://yulong-wu-jackson.github.io/rack-and-share/

## The demo

The page shows three things at once.

- The gym floor: the rack, the lifter, and a person who wants the rack.
- The station: the screen mounted on the rack.
- The phone: the lifter's app.

It has two modes.

- Watch plays a 70-second story. Marcus checks in and lifts, Maya joins the line without interrupting him, and she later starts her own session without a phone. Space pauses, the arrow keys change chapter, and a click on either device hands control to you.
- Try it lets you use both screens yourself. The white button beside the rack stands for what happens in the gym: tapping the phone on the rack, lifting the bar, and racking it.

Add `?mode=try` to the URL to open in Try mode.

## Run it

[mise](https://mise.jdx.dev) installs Node and pnpm and runs every task.

```bash
mise install
mise run install
mise run dev
```

| Task | What it does |
| --- | --- |
| `mise run dev` | Starts the dev server |
| `mise run build` | Type-checks and builds into `dist` |
| `mise run preview` | Serves the production build |
| `mise run check` | Runs lint, type check and tests |
| `mise run format` | Formats and applies safe lint fixes |

## Code layout

| Folder | Contents |
| --- | --- |
| `src/state` | The rack's rules (`model.ts`, with tests) and the app store |
| `src/station` | The screen on the rack |
| `src/phone` | The lifter's app |
| `src/scene` | The animated gym floor |
| `src/stage` | Page layout, top bar, captions and the phone-tap animation |
| `src/director` | The Watch mode story and its playback clock |

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`, which checks, builds and publishes the site to GitHub Pages. The repository's Pages source must be set to GitHub Actions.
