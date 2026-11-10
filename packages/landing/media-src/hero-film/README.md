# Hero film (VENT-112)

The landing page's hero: one continuous camera move from the whole Moon down to 2 m over IM-2 Athena's touchdown
point on Mons Mouton (84.7906° S, 29.1957° E), ending on the Earth over the horizon through a long lens, then a locked
hold that loops. The instant is **2026-12-15 05:00:00 UTC** (the human's choice: the Earth 70 % lit, 4.9° up; the Sun
2.4° up in the east, out of frame to the right, raking the ground). No cuts, no dissolves, no fades, no audio, no text.

The Moon, its sky and the camera rig are `../moon-scene` (a module other compositions reuse); this folder is the move
and the deliverables.

## Render it

From the repository root, with the repository's `npm ci` and raea 0.1.0 (`~/.gamestudio/raea/`, offline, the Mac's GPU):

```sh
S=packages/landing/media-src/moon-scene/scripts; F=packages/landing/media-src/hero-film
node $S/fetch-tiles.mjs
node $S/sky.mjs --instant 2026-12-15T05:00:00Z
node $S/textures.mjs --out $F/media/moon
node $S/build.mjs --instant 2026-12-15T05:00:00Z --out $F/media/moon --sector 325,22,8192
node $F/scripts/framing.mjs        # the path as built, where the Earth lands
cd $F
RAEA="env HOME=$HOME/.gamestudio/raea/home RAEA_OFFLINE=1 $HOME/.gamestudio/raea/raea/bin/raea"
$RAEA render film.tsx --composition desktop-descent -o out/masters/desktop-descent-png   # 421 PNG, about 40 s
$RAEA render film.tsx --composition phone-descent -o out/masters/phone-descent-png
bash scripts/deliver.sh            # lossless masters, the holds, posters and H.264 previews from the PNGs
```

`media/` and `out/` are git-ignored. Compositions: `<look>-descent` (frames 0 to 420, the masters), `<look>` (descent
and 6 s of hold, previews), `<look>-guides` (with the brief's framing guides) and `diag-*` (normals, hillshade, shading,
sunlit, no detail: the views used to hunt the tile structure).

## Deliverables (out/)

| Path | What |
|---|---|
| `masters/<look>-descent-png/frame-00000.png` … `frame-00420.png` | the descent, PNG, 1920 x 1080 or 1080 x 1920, 30 fps |
| `masters/hero-<look>-descent.mkv` | the same, lossless (FFV1) |
| `masters/hero-<look>-hold.mkv` | the hold, lossless, 7 s: the descent's last frame, locked, so it loops seamlessly and starts where the descent ends |
| `posters/hero-<look>-poster.png` | the hold's frame |
| `previews/hero-<look>-descent.mp4`, `hero-<look>-hold.mp4` | H.264 previews, each under 30 MB |

## The move

The path (`scene/path.ts`) follows the brief's beats on a monotone cubic of the log altitude, flat at both ends: about
3 900 km at 3 s, 150 km at 7 s, 200 m at 11.5 s, 2 m at 14 s, the speed falling all the way down. The camera comes in
along the final heading over the south pole, looking at the lit Moon, then at the target, then pitching up to the
horizon. From 2 km down the focal length grows on the same smooth curve: desktop 58° to 27° horizontal, phone 23° to 9°,
so the Earth, at its true 1.83°, takes 7 % of the desktop frame's width and 20 % of the phone's. Final heading 324.5°
(desktop) and 324.7° (phone), on the Earth.

## Provenance (for ASSETS.md)

- **Render tool**: raea 0.1.0 (FSL-1.1-ALv2), a build tool run on the Mac; nothing of it ships. Source of the shot:
  this folder and `packages/landing/media-src/moon-scene/` (MIT, this repository).
- **Relief**: NASA LRO LOLA gridded elevation, PDS data set `LRO-L-LOLA-4-GDR-V1.0` (LDEM_80S_20M, LDEM_80S_80M,
  LDEM_75S_240M, LDEM_256, LDEM_128), read as the levelled tiles of Ventana Lunar's API
  (`https://nasa.universelle.io/api/v1/terrain/tiles`, `docs/terrain-api.md`). Public domain; credit NASA/GSFC, the
  LOLA team. Cleaned of along-track artefacts and blended into one field as `moon-scene/README.md` says.
- **Fine relief at the site**: LROC NAC DTM NOBILE03 (P847S0291), 4 m, area-averaged to 5 m, the app's fine tile
  `packages/web/public/fine-tiles/mons-mouton/` (sources and hashes in its `tile.json` and in `/ASSETS.md`). Credit
  NASA/GSFC/Arizona State University; no licence text on the product, used with that credit by the human's decision
  (2026-11-01, as for the app).
- **Moon colour and far relief**: the app's LROC WAC colour map (`moon-lroc-4k.jpg`) and LOLA normal map
  (`moon-lola-normal-4k.jpg`), NASA SVS «CGI Moon Kit» (https://svs.gsfc.nasa.gov/4720), public domain.
- **Earth**: the app's `on-foot-earth.webp`, from NASA Visible Earth «Blue Marble Next Generation with topography and
  bathymetry» (December 2004, https://visibleearth.nasa.gov/images/73909), public domain; cloud-free, so it shows land
  and ocean, not the weather of the day.
- **Sky** (Sun, Earth, phase, the Earth's face and axis): `@ventana/sim`, Ventana Lunar's closed-form sky (Meeus),
  within 0.05° of JPL Horizons in elevation; checked against the app's LOLA horizon profile of IM-2.
- **Photometry**: Hapke et al. 2012 (JGR 117, E00H15), lunar highlands, as the app's on-foot view.
- **Illustrative detail** (below the relief's resolution, generated, not measured): crater counts after Minton et al.
  2019 (arXiv:1902.07746) lower bound, depths after Basilevsky 1976 (LPSC 7); rocks after Golombek and Rapp 1997 (JGR
  102, 4117); our own hummock noise. The caption should say it is illustrative.
