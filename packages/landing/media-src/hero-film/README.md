# Hero film (VENT-112)

The landing page's hero: one continuous camera move from the whole Moon down to 2 m over IM-2 Athena's touchdown
point on Mons Mouton (84.7906° S, 29.1957° E), ending on the horizon with the low Sun and the Earth in frame, then a
locked hold that loops. The instant is 2026-11-22 20:00:00 UTC, the one the page's live card shows. No cuts, no
dissolves, no fades.

**Status: phase 1**, a low-resolution playblast of the camera path for approval. The full-resolution masters (1920 x
1080 and 1080 x 1920, descent and hold, posters) are phase 2. Nothing here ships with the site: the landing will get
encoded video files.

## Render it

Needs the repository's `npm ci`, Node 22 or later, and raea 0.1.0 (the studio installs it under `~/.gamestudio/raea/`;
it renders on the Mac's GPU, offline).

```sh
cd packages/landing/media-src/hero-film
node scripts/fetch-tiles.mjs     # LOLA relief into cache/tiles/ (364 tiles, about 16 MB, 20 s)
node scripts/sky.mjs             # sky.json from @ventana/sim, printed against the brief
node scripts/textures.mjs        # the app's maps into media/textures/
node scripts/build-terrain.mjs   # media/mesh/terrain.glb (1.9 M vertices, 107 MB) and terrain.json, about 5 s
node scripts/framing.mjs         # the camera path as built, and where the Sun and the Earth land
RAEA="env HOME=$HOME/.gamestudio/raea/home RAEA_OFFLINE=1 $HOME/.gamestudio/raea/raea/bin/raea"
$RAEA render film.tsx --composition desktop --w 960 --h 540 -o out/playblast/hero-desktop-playblast-960x540.mp4
$RAEA render film.tsx --composition phone --w 540 --h 960 -o out/playblast/hero-phone-playblast-540x960.mp4
$RAEA render film.tsx --composition desktop-guides --at 0,120,210,300,360,420 -o out/stills-guides
```

`cache/`, `media/` and `out/` are git-ignored and rebuilt by the commands above. The compositions are `desktop` and
`phone` (descent 0-14 s, then the hold to 20 s) and the same with framing guides over them (`desktop-guides`,
`phone-guides`: the headline box, the calm corner, the horizon band, Sun and Earth markers). `--at` takes frame
numbers (30 fps).

## Files

| Path | What |
|---|---|
| `film.tsx` | The raea composition: camera, sky sphere, the Moon mesh with its shader, the exposure curve |
| `scene/path.ts` | The camera path: altitude, ground track, aim, per look (desktop 16:9, phone 9:16). Pure |
| `scene/frame.ts` | The film's world (origin on the ground at the target, +X east, +Y up, +Z south) from `sky.json` and `terrain.json` |
| `scene/shaders.ts` | WGSL of the Moon (albedo, relief normals, baked shadows, the app's Hapke photometry, regolith detail) and of the sky (Sun, Earth) |
| `scene/guides.tsx` | Review guides drawn over the guides compositions |
| `scripts/regions.mjs` | The target and the squares of tiles read at each level |
| `scripts/fetch-tiles.mjs` | Fetches the levelled tiles from Ventana Lunar's API into the cache |
| `scripts/terrain-data.mjs` | The tile mosaics and one height field over the Moon, levels blended by distance |
| `scripts/build-terrain.mjs` | The log-polar mesh, its normals and its ray-marched sunlit share |
| `scripts/glb.mjs` | A minimal glTF binary writer |
| `scripts/sky.mjs` | `sky.json`: the instant's sky from `@ventana/sim` |
| `scripts/textures.mjs`, `scripts/framing.mjs` | Copy the maps; print the path and the final framing |

## How the level of detail works

The whole Moon is **one static mesh**, a log-polar grid centred on the touchdown point: rings at geodesic distances
growing by 0.8 % from 0.4 m out to 600 km, then by 3 % to the far side, 1 024 vertices each. A triangle covers about
the same number of pixels wherever a camera near the target looks, so the same mesh holds the Moon from 7 600 km and the
ground 2 m under the lens. Nothing switches, streams or fades during the shot, so nothing can pop.

Heights are the four levels of Ventana Lunar's levelled LOLA tiles (15.6 m, 62.5 m, 250 m and 1 km nodes), each used
inside its square around the target (8, 32, 160 and 520 km) and blended into the next coarser one over the outer fifth
of its radius; level 3 fades into the bare sphere at about 500 km, where the shader's LOLA normal map takes over the
relief. Level 0 is read with Catmull-Rom, so the shading has no creases at the nodes. The blends are in space, not in
time.

Shadows are baked per vertex: a ray toward the Sun over the same relief gives the sunlit share of the Sun's 0.53° disc,
so the shadows are those of the instant, soft only by the Sun's own size. Depth uses Bevy's reverse-Z infinite
projection (near 0.05 m), so the Moon from orbit and the ground at 2 m share one camera without z-fighting; the Earth
and the Sun are drawn analytically in the sky shader at their true directions and sizes, so they need no depth range.

## Data and credits

- Relief: NASA LRO LOLA gridded elevation (PDS `LRO-L-LOLA-4-GDR-V1.0`: LDEM_80S_20M, LDEM_80S_80M, LDEM_75S_240M,
  LDEM_256, LDEM_128), served as levelled tiles by Ventana Lunar's API (`docs/terrain-api.md`). Public domain; credit
  NASA/GSFC, the LOLA team.
- Moon colour and far relief: the app's LROC WAC colour map and LOLA normal map (NASA SVS «CGI Moon Kit», public domain;
  see `/ASSETS.md`).
- Earth: the app's Blue Marble map (NASA Visible Earth, public domain; see `/ASSETS.md`).
- Regolith detail (illustrative, under the relief's resolution): Poly Haven «Moon 02» normal map, CC0 (see `/ASSETS.md`).
- Sky (Sun, Earth, phase): `@ventana/sim`, Ventana Lunar's closed-form sky, within 0.05° of JPL Horizons.
- Photometry: Hapke et al. 2012 for the lunar highlands, as the app's on-foot view (`packages/web/src/terrain/hapke.ts`).
- Render tool: raea 0.1.0 (FSL-1.1-ALv2), used to render only; nothing of it ships.
