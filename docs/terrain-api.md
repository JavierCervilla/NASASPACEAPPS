# Terrain service (VENT-40)

The server answers the real horizon of any point on the Moon from NASA's LOLA elevation grids, read from a volume. The
same service is meant to serve height tiles for the 3D view later (VENT-34). The curated sites south of 80° S do not
need it: their horizons ship with the web (`packages/sim/data/horizons.json`), so they answer at once and offline.

## The pure core: `@ventana/sim`

Everything that computes is pure TypeScript in `packages/sim/src`, with no network, disk or DOM, so the server, the
offline script and other projects call the same functions:

| Module | What |
|---|---|
| `terrain-profile.ts` | `HorizonProfile` (int16 hundredths of a degree per azimuth bin, bin `i` at `i * 360 / n`°), `horizonAt` (linear between bins), `isAboveTerrain`, `quantiseDeg` |
| `terrain-codec.ts` | `encodeProfile` / `decodeProfile`: little-endian int16 in base64 (720 bins = 1920 characters) |
| `sun-disc.ts` | `sunDiscVisible`: the fraction of the Sun's disc (radius 0.26645°, IAU nominal values) above the terrain |
| `dem-grid.ts` | `DemGrid`: a grid's size, projection (polar stereographic or simple cylindrical, as the PDS labels define them) and a `dnAt(line, sample)` accessor; `demHeightAt` (bilinear), `pixelOf`, `arrayGrid` |
| `ray-stops.ts`, `ray-march.ts` | `terrainHorizon(bands, observer, bins = 720)`: great-circle rays on the sphere, curvature included, each stop reading the first grid of its band that has a height |
| `terrain-hours.ts` | `terrainHours(hours, profile)`: marks `sunAboveTerrain`, `sunDisc` and `earthAboveTerrain` on each hour; `hasSun`, `hasEarth` and `earthLink` honour them |

The ray-march was checked against the realism study's `horizon.py` (NumPy) at its 11 points: at most 0.0104° apart in
any of the 720 bins, the quantisation step. Its profiles are validated against NASA's AVGVISIB map in
`packages/sim/tests/terrain-validation.test.ts` (see ASSETS.md).

## `GET /api/v1/horizon?lat&lon[&height]`

- `lat`, `lon`: degrees, `lon` east from -180 to 360; checked and rounded to the 0.01° grid of `/ephemeris`.
- `height`: the eye above the ground, metres, 0 to 100, rounded to 0.1 m; default 2 (our choice, a lander deck).

```json
{
  "lat": -84.79, "lonEast": 29.2, "heightM": 2,
  "bins": 720, "profile": "<base64, decodeProfile>",
  "groundM": 5321.3, "coverage": 1,
  "tiers": [
    { "id": "polar-south-20m", "resolutionM": 20, "share": 0.1295 },
    { "id": "polar-south-80m", "resolutionM": 80, "share": 0.7799 },
    { "id": "polar-south-240m", "resolutionM": 240, "share": 0.0906 }
  ]
}
```

`tiers` names the grids that served the rays and their share of the stops, finest first, so a client can say at what
resolution the horizon was seen. `coverage` is the smallest share of a ray's stops some grid covered. Errors: 400 (bad
parameter), 404 (no tier on this server covers the point), 429 (per-address limit, shared with the Horizons misses),
503 (no terrain installed, or the computation queue is full; `Retry-After`). Answers are cached on disk and sent with
`Cache-Control: public, max-age=86400`.

The handler is a serialiser over `HorizonSource.horizon(point)` (`src/terrain/horizon-cache.ts`), so a binary form (for
example a 1° uint16 profile for build-time callers) or a batch form (many points per request) is another serialiser
over the same call. Neither exists yet.

## Tiers and the bands that read them

`packages/server/data/terrain-catalogue.json` lists nine tiers, every file with its PDS URL, label, size and sha256,
and the projection numbers of its PDS label (read on 2026-11-01 from the PDS Geosciences node, LRO LOLA GDR,
`lrolol_1xxx`). A ray reads three bands of distance (our choice, the realism study's validated method), each with its
tiers in order of preference; a stop takes the first tier present on disk that covers it:

| Band | Step | Tiers, preferred first |
|---|---|---|
| 0 to 6 km | 20 m | polar 20 m, global 59 m, polar 80 m, global 118 m, polar 240 m, global 237 m |
| 6 to 150 km | 80 m | polar 80 m, global 118 m, polar 240 m, global 237 m |
| 150 to 200 km | 240 m | polar 240 m, global 237 m |

| Tier | Product | Coverage | Files | Bytes |
|---|---|---|---|---|
| `polar-south-20m` | LDEM_80S_20M | 80° S to the pole | 1 | 1 848 320 000 |
| `polar-north-20m` | LDEM_80N_20M | 80° N to the pole | 1 | 1 848 320 000 |
| `polar-south-80m` | LDEM_80S_80M | 80° S to the pole | 1 | 115 520 000 |
| `polar-north-80m` | LDEM_80N_80M | 80° N to the pole | 1 | 115 520 000 |
| `polar-south-240m` | LDEM_75S_240M | 75° S to the pole | 1 | 29 062 688 |
| `polar-north-240m` | LDEM_75N_240M | 75° N to the pole | 1 | 29 062 688 |
| `global-59m` | LDEM_512 (512 px/°) | the whole Moon | 16 tiles | 33 973 862 400 |
| `global-118m` | LDEM_256 (256 px/°) | the whole Moon | 4 tiles | 8 493 465 600 |
| `global-237m` | LDEM_128 (128 px/°) | the whole Moon | 1 | 2 123 366 400 |

All nine: 48.58 GB. The highest quality without the 118 m fallback (which only fills where a 59 m tile is missing):
40.08 GB. A small server can hold only `global-237m` (2.1 GB) and still answer anywhere, coarsely; `tiers` says so.
The polar caps use the PDS GDR grids, not PGDA product 90's `LDEM_80S_20MPP_ADJ` (a GeoTIFF of the south only):
the PDS grids exist for both poles in one format. LOLA's global LDEM_512 covers ±90°, so no SLDEM2015 (±60°) tier is
needed. Orientation checked against the data: the north polar grid puts 0° E down (line = pole + ρ cos λ), matching
LDEM_128 to a median 9 m at 84.5° to 85.5° N; the flipped orientation differs by 1281 m.

## Running it

| Variable | Default | What |
|---|---|---|
| `TERRAIN_DIR` | unset: `/horizon` answers 503 | the volume with the tier files, under their PDS names |
| `TERRAIN_CACHE_DIR` | `./.cache/terrain` | answers on disk |
| `TERRAIN_CACHE_MB` | 256 | byte cap of the answers, least recently used out first |
| `TERRAIN_BLOCKS_MB` | 192 | grid blocks kept in memory between requests |
| `TERRAIN_MAX_RUNNING` | 2 | horizons computed at once; 16 more may wait, then 503 |

Fetch the tiers into the volume (resumable through `<name>.part` and HTTP Range, each file checked against its size
and pinned sha256; nothing goes into git or the image):

```sh
node packages/server/scripts/fetch-terrain.ts --list
node packages/server/scripts/fetch-terrain.ts --dir /data/terrain --tiers polar-south-20m,polar-south-80m,polar-south-240m,global-237m
```

The disk on Dokploy is a human decision: the volume needs the chosen tiers' bytes above plus `TERRAIN_CACHE_MB`.

### Memory

The grids are never loaded whole. A request runs the ray-march once to note the 256 x 256 blocks its rays cross
(`tier-grid.ts`), reads only those with positioned reads (`block-reader.ts`), and runs it again. Blocks stay in an LRU
under `TERRAIN_BLOCKS_MB`. Measured on 2026-11-01 (Node 22, the four south tiers, LDEM_80N_80M and LDEM_128 present):
63 MB RSS idle, 106 MB after IM-2 (2.7 s, cold), 251 MB peak after a burst of 20 different polar points (18 answered,
2 refused with 503 by the queue), 258 MB after an equatorial point on LDEM_128.

### Precomputed curated sites

```sh
node packages/server/scripts/terrain-horizons.ts --dir /data/terrain          # writes packages/sim/data/horizons.json
node packages/server/scripts/terrain-horizons.ts --dir /data/terrain --check  # recomputes and compares, byte for byte
```

It reads only the south polar tiers and LDEM_128 (past the 240 m cap's rim, for IM-1 at 80.13° S), so the shipped
profiles are the validated method.

## Planned: `GET /api/v1/terrain` (VENT-34)

Height tiles around a point for the 3D view and for other projects, from the same tiers and block reader. Not built.
The interface it should keep:

- Request: `lat`, `lon` (the same checks and grid), `size` (pixels per side), `res` (metres per pixel; the server
  picks the finest tier at or below it and says which).
- Projection: polar stereographic windows at 20 m near the poles (the grid's own pixels, no resampling); simple
  cylindrical elsewhere.
- Body: 16-bit unsigned heights, little-endian, row by row from the upper left, height = `offsetM + value * 0.1 m`.
- Georeference JSON beside it: projection (with its pole or centre longitude and the sphere's radius), the upper-left
  corner's coordinates, pixel size, `offsetM`, the step (0.1 m), the tier id and the source file's sha256.
