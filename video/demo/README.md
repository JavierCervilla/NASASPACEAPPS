# Demo video (VENT-110)

The 30 s demo for the NASA Space Apps Challenge 2026 submission: real footage of the live app with English text over
it and a synthesized music bed, no voice. 1920 x 1080, 30 fps, H.264 + AAC.

| Path | What |
|---|---|
| `capture/capture.mjs` | Films the live app with Playwright (fixed clock, site and hour; waits on the interface's own state) |
| `capture/screencast.mjs` | Records the DevTools screencast at device scale 2 (3840 x 2160) and encodes it at a constant 30 fps |
| `capture/cursor.mjs` | Draws a mouse pointer in the capture browser only (headless Chromium shows none) |
| `edit.tsx` | The composition: shots, text cards, the music bed and the mix |
| `media/`, `out/` | The footage, its step times and the renders: git-ignored, rebuilt by the two commands below |

## Make it

Needs the repository's `npm ci`, Playwright's Chromium (`npx playwright install chromium` if missing), ffmpeg, and
raea 0.1.0 (the studio installs it under `~/.gamestudio/raea/`; it renders on the Mac's GPU).

```sh
node video/demo/capture/capture.mjs        # media/footage.mp4 and media/capture.json, about a minute
cd video/demo
RAEA="env HOME=$HOME/.gamestudio/raea/home RAEA_OFFLINE=1 $HOME/.gamestudio/raea/raea/bin/raea"
$RAEA render edit.tsx -o out/ventana-lunar-demo.mp4 --manifest out/render.json --quality master
$RAEA check out/ventana-lunar-demo.mp4 --manifest out/render.json --shape 16:9
```

The capture films https://nasa.universelle.io/app/ when that address serves the app, else the root; `DEMO_URL`
overrides it. The take: the globe turns to the south pole and zooms in, the site picker selects the Shackleton
connecting ridge, the strip's slider moves from 14 Nov 13:00 UTC (Sun, no Earth) to 20 Nov 16:00 UTC (a landing
window), then the DSN view (Robledo de Chavela listening) and the Horizon view. `edit.tsx` cuts its shots from the
step times in `media/capture.json`, so a new take keeps the edit in step.

## Sound

The bed is made in `edit.tsx` with raea's Tone.js layer and its built-in synths only (a detuned sine pad, a sine sub
and a triangle bell through a low-pass filter and a reverb), one chord per shot, faded out on the end card. No
samples, no sound library and no generated audio. `<Mix>` masters it to -14 LUFS.

## Credits

The footage shows the app and the data it is built on, credited in full in `/ASSETS.md` and `/README.md`:

- Sun and Earth positions: NASA/JPL Horizons API.
- Globe imagery: LRO LROC WAC colour mosaic, from NASA's Scientific Visualization Studio «CGI Moon Kit»
  (https://svs.gsfc.nasa.gov/4720; visualizer Ernie Wright, USRA; scientist Noah Petro, NASA/GSFC), public domain.
- Terrain and horizons: LRO LOLA elevation (NASA PGDA) and LROC NAC DTM, as the app's Horizon view captions them.
- Deep Space Network: station positions from the DSN Telecommunications Link Design Handbook 810-005 (NASA/JPL).
- Earth in the Horizon view: NASA Visible Earth «Blue Marble Next Generation», public domain.

Built for the NASA Space Apps Challenge 2026, Madrid. Not endorsed by NASA.
