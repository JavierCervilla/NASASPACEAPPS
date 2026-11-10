# moon-scene

The real Moon for raea compositions: LOLA relief resampled into one seamless field around a site, built into a single
static mesh with the shadows of a chosen instant baked in, and the Sun and the Earth of that instant from `@ventana/sim`,
drawn by one component, `MoonScene`. The landing's hero film (`../hero-film`) is one consumer; any composition can be
another. Nothing here ships with the site.

## Build the inputs of a composition

Needs the repository's `npm ci`, Node 22 or later, and raea 0.1.0 (the studio installs it under `~/.gamestudio/raea/`).
Run from the repository root; `<media>` is the consuming composition's `media/` folder (raea reads only that folder).

```sh
S=packages/landing/media-src/moon-scene/scripts
node $S/fetch-tiles.mjs [--site im2]                       # LOLA tiles into cache/tiles/ (364 tiles, 16 MB, 20 s)
node $S/sky.mjs --instant 2026-12-15T05:00:00Z [--site im2] # the sky of the instant, and the LOLA horizon check
node $S/textures.mjs --out <media>/moon                    # the app's maps into <media>/moon/textures/
node $S/build.mjs --instant 2026-12-15T05:00:00Z --out <media>/moon [--site im2] [--sector 325,22,8192]
```

`build.mjs` writes `<media>/moon/moon-<site>-<instant>.glb` (the mesh, about 180 MB with a sector) and
`moon-<site>-<instant>.json` (the target's frame and the instant's sky). Options: `--around N` azimuths (1 024),
`--ratio Q` ring spacing (1.009), `--sector HEADING,HALF,N` N-per-turn azimuths within HALF degrees of HEADING, where a
shot's last frames look through a long lens (none by default).

Caches, all under `cache/` (git-ignored): the tiles by key; the seamless field by site and tile version
(`cache/field/`); the mesh geometry by site, field and mesh options (`cache/geometry/`); the sunlit shares by geometry
and instant (`cache/shadows/`). A second instant over the same site re-marches only its shadows (about 15 s); the same
instant again only rewrites the two files (about 2 s).

Sites live in `scripts/sites.mjs` (`im2`, IM-2 Athena's point on Mons Mouton). Another site is a target point, the
radius read at each tile level, optionally one of the app's fine DTM tiles and its id in
`packages/sim/data/horizons.json`.

## Use it in a composition

```tsx
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "raea";
import world from "./media/moon/moon-im2-20261215T0500Z.json";
import { MoonScene, sceneFrame } from "<path>/moon-scene/scene/MoonScene.tsx";
import type { Shot, WorldFile } from "<path>/moon-scene/scene/frame.ts";

const built = world as WorldFile;
const frame = sceneFrame(built); // world vectors: centre, sun, earth, earthAxes, east/up/north

function Shot1() {
  const t = useCurrentFrame() / 30;
  const shot: Shot = { eye: [0, 2, 0], forward: [-0.58, 0, -0.81], up: [0, 1, 0], fovY: 0.27 }; // your camera path
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <MoonScene world={built} shot={shot} height={1080} exposure={1.6} earthGain={1.8} />
    </AbsoluteFill>
  );
}
```

The world is metres with the origin on the ground at the site's target, +X east, +Y up, +Z south there (so heading ψ is
`[sin ψ, 0, -cos ψ]`). The Moon's centre is `frame.centre`; a camera thousands of km out works (the component aims at a
far point, so f32 does not round the view). `MoonScene` props:

| Prop | What |
|---|---|
| `world` | the imported JSON from `build.mjs` |
| `media` | the folder under the composition's `media/` holding the mesh and `textures/` (`"moon/"`) |
| `shot` | `{ eye, forward, up, fovY }` for this frame, world units, `fovY` in radians |
| `height` | the frame's height in pixels (sets each pixel's footprint, which fades the fine detail in and out) |
| `exposure` | the sunlit ground's exposure; keep it a smooth function of time |
| `earthGain` | the Earth's day side over its albedo, its own exposure (a camera exposed for the ground would clip it) |
| `detail` | strength of the illustrative relief, 0 to 1 (1) |
| `mode` | diagnostic views: 1 geometric normals, 2 hillshade of the data alone, 3 shading normal, 4 sunlit share (0) |

`frame.ts` also has `project(shot, direction, aspect)` (where a direction lands on screen) and `horizontal(direction)`
(elevation and azimuth at the target), for framing checks.

## How it holds together

- **One seamless field** (`scripts/field.mjs`): the four levels of Ventana Lunar's levelled tiles, each one grid; the
  coarser grids replaced by the finer data low-passed wherever the finer one is blended in, so levels agree; wide
  feathered blends (a level fully used within 35 % of its radius, gone by 80 %); the site's 5 m NAC DTM laid over it
  where its own data is (feathered 300 m from its edge and out of its holes). LOLA's along-track artefacts (dotted lines
  of bad shots, thin ridges) are cleaned on levels 0 and 1: single-node spikes to the 3 x 3 median, then a one-node
  Gaussian across the track direction found in the data.
- **One static mesh** (`scripts/build.mjs`): a log-polar grid around the target, rings from 0.4 m to the far side, the
  same azimuths on every ring (denser in the sector), so nothing switches level and nothing can pop; normals from the
  merged field; the bare sphere past ~500 km, where the LOLA normal map takes over in the shader.
- **Baked shadows**: per vertex, a ray toward the Sun over the field gives the sunlit share of the Sun's 0.53° disc.
- **Illustrative relief under the data's resolution**, per pixel in the shader, seeded by world cell, so it never
  repeats and never switches: craters 0.15 to 19 m (count from Minton et al. 2019's lower bound at Apollo 15, depths
  from Basilevsky's classes, as the app's on-foot view), rocks 8 cm to 1.3 m (Golombek and Rapp's law, k = 0.006, q held
  at 9.39), hummocks 0.4 to 13 m; each scale fades in by the pixel's footprint, and their shadows are marched toward
  the Sun per pixel.
- **Light**: the app's Hapke photometry; albedo from the LROC map, blurred where real relief carries the shading (the
  polar mosaics hold their own shadows); the Earth's light and a little bounce as the only fill; the Earth drawn
  analytically at its true size, phase and orientation, Blue Marble cloud-free; no stars.

## What raea 0.1.0 could not do, and the way round

- `ShaderMesh` takes a fragment shader only: the relief is displaced on the CPU into the mesh.
- `BufferMesh` passes vertices as JSON, too big for 3 million vertices: the mesh is a `.glb` asset, given to an
  `Entity` as `BevyComponent Mesh3d` `"<file>.glb#Mesh0/Primitive0"` with raea's shader material beside it (works, not
  documented).
- Positions are f32: the world's origin is the target and the camera aims at a far point.
- Shadow maps would need cascades across 7 000 km to 2 m and would pop: shadows are baked (terrain) and marched per pixel
  (detail).
- No auto exposure: the composition gives a smooth curve.

## Credits

LOLA relief: NASA LRO LOLA gridded elevation (PDS `LRO-L-LOLA-4-GDR-V1.0`), public domain, NASA/GSFC, the LOLA team,
via Ventana Lunar's API. Fine relief: LROC NAC DTM NOBILE03, NASA/GSFC/Arizona State University (the app's fine tile,
`/ASSETS.md`). Maps: LROC WAC colour and LOLA normal maps, NASA SVS «CGI Moon Kit», public domain; Blue Marble Next
Generation, NASA Visible Earth, public domain (`/ASSETS.md`). Sky: `@ventana/sim`.
