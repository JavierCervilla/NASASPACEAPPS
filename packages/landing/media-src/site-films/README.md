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
moon-scene's `sky.mjs`:

- **sunlit** (some of the Sun's disc clears the terrain): the hero film's light, its exposure curve (2.4 high up to 1.9
  at the eye), the Earth's light and 3 % of the sunlit ground's light scattered into shadows.
- **earthlit** (the Sun under the terrain, the Earth over it): no Sun is faked. From 80 m down to 3 m the camera opens
  up, as a camera set for the dark would, until the Earth-lit ground reads as night, darker than the sunlit films'
  ground (the gain at the eye is 0.03 / (0.002 x 1.9 x the sine of the Earth's elevation), about 100 times). Everything
  in the frame is brightened by the same factor, so sunlit terrain still in view clips to white. The light scattered
  into shadows keeps its brightness as the camera opens up, down to a tenth of the Earth's light on flat ground.
- **dim** (neither clears the terrain): the floor stays near black. The camera opens up only 1.5 times (from 20 km to
  200 m), so the terrain the low Sun reaches reads as in the sunlit films; the floor gets only the scattered share; a
  faint starfield (moon-scene's `stars`). The Earth's light is left out wherever the target does not see the Earth (the
  shader does not shadow it).

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
- **Stars** (dim films only): procedural, not a catalogue: one star at most per 0.3° cell, brightness from a steep
  power law. Illustrative; the caption should not present them as the real sky.
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
  app's verdict for its light.
- The app's lunar night adds a reading light and lifts the Earth's light (VENT-100); the films do not, so an Earth-lit
  or dim film ends darker than the app opens at that site, and the crossfade brightens.
