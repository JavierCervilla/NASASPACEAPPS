# Site films (VENT-115)

The 3D view loader's films (VENT-61, variant C): per curated site, one continuous move from 40 km over the site down
to the eye 2 m over the ground, ending on the view the app's 3D view opens on, then a one-second still hold the loader
crossfades from (about 0.6 s) into the live view. The instant is **2026-12-15 05:00:00 UTC** for every site. No cuts,
no audio, no text.

The Moon, its sky and the camera rig are `../moon-scene` (the hero film's module, `../hero-film`); this folder is the
move, the light per site and the deliverables. Sites, in the order they are made: `scripts/sites.mjs`.

## Make one

From the repository root, with the repository's `npm ci`, Node 22 or later, ffmpeg, Python 3 with Pillow and NumPy,
and raea 0.1.0 (`~/.gamestudio/raea/`, offline, the Mac's GPU; nothing is installed or downloaded with it):

```sh
F=packages/landing/media-src/site-films
bash $F/scripts/build-site.sh artemis-haworth    # tiles, maps, the Moon built for the instant; prints the plan
bash $F/scripts/render-site.sh artemis-haworth   # 2x render, masters, stills, previews, coverage, jump scan
python3 $F/scripts/sheet.py                      # the contact sheet of every site made so far
```

A site takes about 25 s to build (tiles cached, field built once per site) and 2 to 3 minutes to render, deliver and
check on an M3 Max. `<site-id>/media/`, `<site-id>/out/` and `out/` are git-ignored.

`build-site.sh` builds the mesh with its azimuths dense within 45° of the final heading (6 144 per turn there, 1 024
elsewhere), so the skyline of the last frames stays smooth through the app's lens. `framing.mjs` prints the plan as
built: the sky at the target against its LOLA horizon, the same march over the film's own relief, the heading rule
applied, the light, and the path every half second with the clearance over the ground under the eye (it fails under
1 m before the end).

Compositions (`scene/film.tsx`, registered by each `<site-id>/film.tsx`): `wide` and `phone` (frames 0 to 150 at the
final size), `wide-2x` and `phone-2x` (the same at twice the size: the masters are these frames scaled down, so the fine
relief is supersampled; the detail still fades by the final pixel's footprint), `diag-normals-<look>` (the coverage
check) and `diag-sunlit-<look>` (the sunlit share).

## Deliverables (`<site-id>/out/`)

| Path | What |
|---|---|
| `masters/<site>-wide-png/frame-00000.png` … `frame-00179.png` | 16:9, 1920 x 1080, 30 fps: the move (0 to 150) and the hold (150 to 179, the last frame repeated) |
| `masters/<site>-phone-png/…` | the same at 9:16, 1080 x 1920 |
| `masters/<site>-wide.mkv`, `<site>-phone.mkv` | the same, lossless (FFV1, RGB) |
| `stills/<site>-<look>-start.png`, `-end.png` | frame 0 and frame 179 |
| `previews/<site>-<look>.mp4` | H.264 previews, each under 10 MB |
| `../out/site-films-contact-sheet.png` | one page: per site, the start and end stills of both looks |

The checks run by `render-site.sh`: the coverage check (`scripts/coverage.py`: the surface fills every frame under its
skyline, in the normals view) and the jump scan (`scripts/jumps.py`: no frame changes much more than its neighbours,
and the hold does not change at all).

## The move (`scene/path.ts`)

6 s at 30 fps: 5 s of move, 1 s of hold. The log altitude follows a monotone cubic through 40 km at 0 s, 2.5 km at 2 s,
40 m at 3.6 s and 2 m at 5 s, already moving at the first frame and flat at the last; the last 1.5 s run on a warped
clock that stops with no speed left, so the speed in metres per second falls all the way down (the hero's braking
feel, about 42 km/s at the first frame, 585 m/s at 200 m, 5 m/s at 2.7 m). The camera comes in along the final heading
from behind the target (30 % of its altitude behind it), looking down at the target (73° under the level) above 15 km,
then pitching up on a smooth curve of the log altitude to the app's opening pitch.

The end is the app's opening view at the instant (`packages/web/src/terrain/view-camera.ts`, `on-foot-model.ts`,
`view-fov.ts`, imported where they export it): the eye `EYE_M` = 2 m over the ground at the target; the heading the
Sun's azimuth when the Sun's geometric elevation at the site (`@ventana/sim` `skyAt`) is over -2° (`NEAR_SKY_DEG`),
else the Earth's; the pitch `START_PITCH` = 2° up; the vertical field of view 50° on 16:9 and 62° on 9:16
(`VIEW_FOV`), all the way through: no long lens.

## The light (`scene/light.ts`)

Decided at the eye from the app's LOLA horizon (`packages/sim/data/horizons.json`), written into the built world by
moon-scene's `sky.mjs`, the profile the app decides day and night with:

- **sunlit** (some of the Sun's disc clears the terrain): the hero film's light all the way, its exposure curve (2.4
  high up to 1.9 at the eye), the Earth's light and 3 % of the sunlit ground's light scattered into shadows.
- **earthlit** (the Sun under the terrain, the Earth over it) and **dim** (neither clears it): no Sun is faked (the
  Sun term stays the baked one), and the film ends on **the app's lunar night** (VENT-100), so the loader's crossfade
  neither brightens nor darkens. From 3 km down to 20 m every value blends smoothly from the hero's light into the
  app's: the exposure opens as the app's does at night (`DARK_EXPOSURE` 2.8 over the day's 1.35 x 1.2, on the hero's
  1.9: 3.28); the hemisphere floor at a quarter of the day's (0.25 x 1.1 over the key's 4, sky `0x9097a8` over ground
  `0x8a857d`); the Earth's light at half the key by its lit share and its rise over the horizon (from -0.5°, over
  2°); the cool reading light (0.15 of the key from 300° at 10°, `0xdfe3ec`, no shadows); the scattered share and the
  hero's Earth light fade out; a faint starfield fades in. The app's constants are copied into `APP_NIGHT` and held to
  the app's code by `packages/landing/tests/site-films-light.test.ts`. moon-scene draws these lights only behind its
  `night` prop (`TERRAIN_NIGHT`); its defaults, and the hero, are unchanged.
- **Matched to the live app** (`APP_MATCH` 0.3): with the app's values the films' night ground came out about twice
  as bright (sRGB) as screenshots of the live app at the same point and instant (Playwright on
  `https://nasa.universelle.io/app/?site=<id>#horizon`, the clock fixed to 2026-12-15T05:00:00Z), while IM-2's sunlit
  ground matched: the two renderers differ in maps, photometry and tone curve (the app's ACES). The night lights are
  scaled by 0.3, so the ground under them meets the app's (median luma of the lower ground: Malapert Massif 61 vs the
  app's 66, Haworth 37 vs 34); the exposure, and with it the sunlit terrain, stays the app's.

## Provenance (for ASSETS.md)

- **Render tool**: raea 0.1.0 (FSL-1.1-ALv2), a build tool run on the Mac; nothing of it ships. Source of the shots:
  this folder and `packages/landing/media-src/moon-scene/` (MIT, this repository).
- **Relief**: NASA LRO LOLA gridded elevation, PDS data set `LRO-L-LOLA-4-GDR-V1.0` (LDEM_80S_20M, LDEM_80S_80M,
  LDEM_75S_240M, LDEM_256, LDEM_128), read as the levelled tiles of Ventana Lunar's API
  (`https://nasa.universelle.io/api/v1/terrain/tiles`, `docs/terrain-api.md`). Public domain; credit NASA/GSFC, the
  LOLA team. Cleaned of along-track artefacts and blended into one field as `../moon-scene/README.md` says.
- **Fine relief at four sites**, the app's fine tiles (`packages/web/public/fine-tiles/`, sources and hashes in each
  `tile.json` and in `/ASSETS.md`), laid over LOLA within about 750 m of the target: IM-2 Athena, LROC NAC DTM NOBILE03
  (P847S0291); Blue Moon MK1 (Shackleton connecting ridge), LROC NAC DTM ESALL_SR12 (P897S2037); IM-1 Odysseus, LROC
  NAC DTM MALAPERTA01 (P803S0015) (credit NASA/GSFC/Arizona State University; used with that credit by the human's
  decision, 2026-11-01); Malapert Massif, PGDA product 104 (SfS, 5 m, CC BY 4.0, Bertone et al. 2025,
  doi:10.5281/zenodo.17954508). **The other seven sites have no fine DTM**: under LOLA's 20 m the near ground is the
  procedural detail below, nothing measured.
- **Moon colour and far relief**: the app's LROC WAC colour map and LOLA normal map, NASA SVS «CGI Moon Kit»
  (https://svs.gsfc.nasa.gov/4720), public domain.
- **Earth**: the app's `on-foot-earth.webp`, NASA Visible Earth «Blue Marble Next Generation» (December 2004), public
  domain; cloud-free. It is out of frame at the end of every film made so far.
- **Stars** (Earth-lit and dim films, fading in near the ground): procedural, not a catalogue: one star at most per
  0.3° cell, brightness from a steep power law. Illustrative; the caption should not present them as the real sky.
- **Sky** (Sun, Earth, phase): `@ventana/sim`, Ventana Lunar's closed-form sky (Meeus), within 0.05° of JPL Horizons in
  elevation; the Sun's and the Earth's visibility checked against the app's LOLA horizon profile of each site.
- **Photometry**: Hapke et al. 2012 (JGR 117, E00H15), lunar highlands, as the app's on-foot view.
- **Illustrative detail** (below the relief's resolution, generated, not measured), as the hero film: crater counts
  after Minton et al. 2019 (arXiv:1902.07746) lower bound, depths after Basilevsky 1976 (LPSC 7); rocks after Golombek
  and Rapp 1997 (JGR 102, 4117); hummock roughness sized to LOLA's highland slopes (Rosenburg et al. 2011, JGR 116,
  E02001); our own noise for clods and albedo mottling. The caption should say it is illustrative.

## Known differences from the app

- **The film's relief and the app's horizon profile can disagree in the near field.** The app's profile marches LOLA
  20 m bilinear; the film's relief is the fine DTM and the cleaned LOLA field. On a steep slope a metre of difference
  40 m away moves the horizon by about 1.5°. `framing.mjs` prints both. At Malapert Massif (a 7° local slope,
  `/ASSETS.md` notes it for the Sun share too) the profile hides the Sun (horizon 1.18°, the Sun 0.04° up), while from
  2 m over the film's relief about three quarters of its disc clear a near rise: the end frames show the Sun's disc
  on the skyline over Earth-lit ground in shadow (the ground's shadow is baked from 0.5 m up). The film keeps the
  app's verdict for its light (kept as it is by the Ventana Lunar session's decision).
- The night films' end is matched to the app's live view by the ground's brightness, not pixel for pixel: the app's
  relief, rocks and labels differ, and it shows almost no stars.
