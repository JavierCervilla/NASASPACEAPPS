# Demo videos (VENT-110)

Two cuts from the same pieces, 1920 x 1080 at 30 fps, H.264 + AAC, English text, no voice:

| Cut | Composition | Length | For |
|---|---|---|---|
| Hero | `hero.tsx` | 68 s | the web, social posts, the portfolio and the Madrid pitch |
| Submission | `submission.tsx` | 30 s | the NASA Space Apps demo (30 s at most) |

Structure: a hook (a 3D dive to the lunar south pole and the question), the stakes (where NASA's Artemis III will
land, a Sun that skims the horizon for days, an Earth that hides for weeks), the reveal, three feature beats (find the
window, see who's listening, stand on the real terrain), any device (laptop and phone), the proof (the NASA open data
the app is built on and its accuracy against JPL Horizons) and the call to action (address, QR code, event, team).

| Path | What |
|---|---|
| `scenes/moon.tsx`, `scenes/shots.tsx` | The 3D Moon, Earth and star field (shaders over the app's own textures) and the camera paths |
| `scenes/plates.ts`, `scenes/opening.tsx` | The opening's shot specs for the hero film's terrain pipeline (VENT-112) and the switch that plays a pipeline scene, a rendered plate or the 3D fallback |
| `assets/universelle-logo.svg` | The team's wordmark, for the end card |
| `parts/beats.tsx` | Each beat's words, devices and footage, shared by both cuts |
| `parts/devices.tsx` | A generic laptop and phone drawn in code, the footage inside their screens |
| `parts/type.tsx`, `parts/theme.ts` | Kinetic type and the app's design tokens (system-ui, the three signal colours) |
| `parts/score.ts` | The music: synthesized in the composition, 120 bpm, one arrangement per cut |
| `parts/qr.ts`, `parts/endcard.tsx` | A dependency-free QR encoder (byte mode, level M) and the end card |
| `capture/` | The Playwright takes of the live app (desktop, on-foot view, phone) and the texture copy |
| `media/`, `out/` | Footage, step times, textures and renders: git-ignored, rebuilt by the commands below |

## Make them

Needs the repository's `npm ci`, Playwright's Chromium (`npx playwright install chromium` if missing), ffmpeg, and
raea 0.1.0 (installed by the studio under `~/.gamestudio/raea/`, rendering on the Mac's GPU, run offline).

```sh
node video/demo/capture/textures.mjs           # the app's Moon and Earth textures into media/textures/
node video/demo/capture/logo.mjs               # the team's wordmark as a white PNG, media/universelle-logo.png
node video/demo/capture/capture.mjs all        # media/{desktop,onfoot,mobile}.mp4 and .json, about two minutes
cd video/demo
RAEA="env HOME=$HOME/.gamestudio/raea/home RAEA_OFFLINE=1 $HOME/.gamestudio/raea/raea/bin/raea"
$RAEA render backdrop.tsx -o media/plates/end-backdrop-placeholder.png --frame 0   # end card backdrop until VENT-112
$RAEA render hero.tsx -o out/ventana-lunar-hero.mp4 --manifest out/hero.json --quality 0.97
$RAEA check out/ventana-lunar-hero.mp4 --manifest out/hero.json --shape 16:9
# the submission cut opens on dark 3D: render PNG frames and encode them with more bits for the near-blacks
$RAEA render submission.tsx -o out/ventana-lunar-submission.mp4 --manifest out/submission.json --quality 0.97
RAEA_READBACK=rgba $RAEA render submission.tsx -o out/frames-submission/
ffmpeg -framerate 30 -i out/frames-submission/frame-%05d.png -i out/ventana-lunar-submission.mp4 -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 10 -tune grain -pix_fmt yuv420p -c:a copy -movflags +faststart \
  out/ventana-lunar-submission-master.mp4
$RAEA check out/ventana-lunar-submission-master.mp4 --manifest out/submission.json --shape 16:9
```

The takes film https://nasa.universelle.io/app/ (`DEMO_URL` overrides it) with a fixed clock and site, each step
waiting on the interface's own state; the cuts read each step's second from `media/<take>.json`, so a new take keeps
them in step:

- **desktop** (1920 x 1080 CSS px at device scale 2): the globe turns to the south pole, the header's picker selects
  the Shackleton connecting ridge, the strip's slider moves from 14 Nov 2026 13:00 UTC (Sun, no Earth) to 20 Nov
  16:00 UTC (a landing window), and the DSN view shows Robledo de Chavela listening.
- **onfoot** (the same size): the Horizon view at Mons Mouton (IM-2) on 22 Nov 2026 20:00 UTC, Sun and Earth both up,
  turned by two slow drags.
- **mobile** (390 x 844 at device scale 3, touch): the Sites tab, the Calendar's columns dragged with a finger to
  20 Nov 18:00 UTC, the DSN and Horizon tabs.

## What is 3D and what is footage

The Moon shots (dive, Artemis, the Sun on the horizon, the Earth setting, the pull-back, the reveal and the proof's
background) are rendered by raea's 3D: a sphere whose shader maps the app's LROC colour map, its south polar map past
80° S and its LOLA relief (object-space normals) from each pixel's latitude and longitude, lit by the Sun with a
lunar Lommel-Seeliger law. The Sun keeps to the real range of the sub-solar latitude (within 1.54° of the equator),
so at the pole it always grazes the horizon; the Earth is the Blue Marble map at its real distance and size, and it
sets by a change of apparent latitude within the real libration (±6.7°). Everything else is footage of the live app.

## The opening and the terrain pipeline

The opening's shots are specified in `scenes/plates.ts` for the terrain pipeline of the hero film (VENT-112, a real
LOLA mesh with shadows baked for the instant): instant or time-lapse span, target, camera move, length per cut and
what must be in frame, each instant chosen from `@ventana/sim` (`skyAt` and the curated sites' terrain horizons). Each
shot plays, in this order, a scene imported into `SCENES` (`scenes/opening.tsx`), its rendered plate
(`media/plates/<file>`, named in `plate`), or the raea 3D fallback. The end card's backdrop is one still, `END_BACKDROP`
in `scenes/plates.ts`: a frame of the raea Moon for now (`backdrop.tsx`), the hold frame of the hero film (the Mons
Mouton horizon with the Earth, 2026-12-15 05:00 UTC) once it exists, shown defocused and darkened behind the text.

## Claims on screen and their sources

| On screen | Source |
|---|---|
| «NASA Artemis III: astronauts will land near the lunar south pole» | NASA, «NASA Provides Update on Artemis III Moon Landing Regions», 28 Oct 2024, https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ |
| «The Sun skims the horizon for days», «Earth hides for weeks», «Sun 100 %, Earth 26 %» | the app's own data for the Shackleton connecting ridge in Nov 2026 (the strip and the site card in the footage) |
| «29 curated sites, or drop a pin anywhere» | `/README.md` (the 29 curated sites of `/api/v1/sites`) and the app's «Drop a pin» |
| «0.04°: its own sky matches JPL Horizons, Sun elevation, every hour of Nov and Dec 2026» | `/CLAUDE.md` (Stack, Sim) and `packages/sim/tests/sky.test.ts` |
| «Robledo de Chavela, Madrid», the dates and hours | the footage itself |

## Licences and credits

- **Render tool**: raea 0.1.0 (https://github.com/shinyobjectz/raea), licence FSL-1.1-ALv2. A build tool for these
  videos only: it is not shipped with the app and nothing of it is in the repository. No raea card, logo or name
  appears in the videos.
- **Capture**: Playwright (Apache-2.0), the repository's own dev dependency.
- **Music**: synthesized in the compositions (`parts/score.ts`) with raea's built-in Tone.js synths: no samples, no
  sound library, no generated or third-party audio.
- **QR code**: drawn by `parts/qr.ts`, written for this repository (MIT, as the rest of it).
- **Team wordmark**: `assets/universelle-logo.svg`, the team's own mark, copied from
  `JavierCervilla/universelle-web` `public/logo.svg` (commit `3ab4c495aa9df98a26a576e5c037893826a8fc66`, sha256
  `a5eb56164e4040d53e00c9b38c589e377fffe6efca942e9c5dc2cb62ab5ed7b5`); `capture/logo.mjs` fills it with the app's
  near-white for the dark end card.
- **Devices**: generic shapes drawn in code; no brand's design, mark or logo.
- **NASA data and imagery shown** (public domain unless noted; full rows in `/ASSETS.md`):
  - Sun and Earth positions: NASA/JPL Horizons API, https://ssd-api.jpl.nasa.gov/doc/horizons.html.
  - Moon colour (globe, 3D Moon, south polar map): LRO LROC WAC colour mosaic from NASA's Scientific Visualization
    Studio «CGI Moon Kit», https://svs.gsfc.nasa.gov/4720 (visualizer Ernie Wright, USRA; scientist Noah Petro,
    NASA/GSFC).
  - Moon relief (3D Moon): LRO LOLA elevation `ldem_16.tif` from the same CGI Moon Kit, with the LOLA team's data.
  - Terrain of the on-foot view and the horizons: LRO LOLA gridded elevation, PDS Geosciences Node
    (https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/), and the LROC NAC DTMs,
    NASA/GSFC/Arizona State University.
  - Earth (3D and on-foot view): NASA Visible Earth «Blue Marble Next Generation»,
    https://visibleearth.nasa.gov/images/73909.
  - Deep Space Network antennas: DSN Telecommunications Link Design Handbook 810-005, module 301,
    https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301N.pdf.
  - The on-foot view's fine ground grain is the app's illustrative Poly Haven «Moon 02» texture (CC0), captioned as
    illustrative in the footage.

Built for the NASA Space Apps Challenge 2026, Madrid, by team Universelle (`TEAM` in `parts/theme.ts`). Not endorsed by
NASA. The English line «Your landing window on the Moon» (`TAGLINE`) sits under the name at the reveal and on the end
card.
