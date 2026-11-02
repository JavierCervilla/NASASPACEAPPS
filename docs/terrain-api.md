# Terrain service (VENT-40)

The server answers the real horizon of any point on the Moon from NASA's LOLA elevation grids, read from a volume. The
same service serves height tiles for the 3D on-foot view (`GET /api/v1/terrain/tile`, VENT-34). The curated sites south of 80° S do not
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
| `tile-scheme.ts`, `tile-key.ts`, `tile-georef.ts`, `tile-locate.ts`, `tile-ring.ts`, `tile-candidates.ts` | The global tiling of VENT-46: `schemeFor`, `tileGeoref`, `sampleDirection`, `tileContaining`, `tilesAround`, `isTileKey` (see «Aligned tiles with levels of detail») |
| `lod-tile.ts`, `tile-quant.ts` | `alignedTile(grids, key)`: the heights at a tile's nodes; `quantiseHeights` / `encodeQuantised` / `decodeQuantised`: the 16-bit form |
| `terrain-tile.ts`, `tile-codec.ts` | `terrainTile(grids, centre, sizeM, n)`: an `n` x `n` height grid in the local tangent plane, and `encodeHeights` / `decodeHeights` (little-endian float32 in base64) |
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
503 (`{"error":"terrain data is not installed"}` while no tier is on disk, which the web shows as «Real terrain not
installed on the server yet»; or the computation queue is full, with `Retry-After`). Answers are cached on disk and sent
with `Cache-Control: public, max-age=86400`; the disk key names the tiers present, so a tier fetched later gives new
answers (a browser may keep an answer from fewer tiers for up to a day).

## `GET /api/v1/terrain/status` (VENT-43)

Every tier of the catalogue and where it stands, and the fetch as a whole. Ids, states and byte counts only: no paths,
URLs or error text.

```json
{
  "fetch": "running",
  "tiers": [
    { "id": "polar-south-240m", "state": "installed", "bytesDone": 29062688, "bytesTotal": 29062688 },
    { "id": "polar-south-80m", "state": "fetching", "bytesDone": 30261248, "bytesTotal": 115520000 },
    { "id": "global-59m", "state": "queued", "bytesDone": 0, "bytesTotal": 33973862400 }
  ]
}
```

`fetch` is `off` (no `TERRAIN_FETCH_TIERS`, or no `TERRAIN_DIR`, then with no tiers), `running`, `done` or `stopped`
with a `reason`: `disk` (the volume would keep less than the margin), `notWritable` (the server cannot write
`TERRAIN_DIR`) or `locked` (another server holds the volume; it waits). A tier is `installed`, `fetching`, `queued`,
`missing` or `failed` (a file failed every retry; the next restart tries again).

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
| `TERRAIN_TILE_CACHE_MB` | 512 | byte cap of the height tiles on disk (`<TERRAIN_CACHE_DIR>/tiles`), least recently used out first |
| `TERRAIN_LOD_CACHE_MB` | 512 | byte cap of the levelled tiles on disk (`<TERRAIN_CACHE_DIR>/lod`), least recently used out first |
| `TERRAIN_MAX_RUNNING` | 2 | horizons and tiles computed at once; 16 more may wait, then 503 |

| `TERRAIN_FETCH_TIERS` | unset: no fetch | `all`, or tier ids separated by commas: the server fetches the missing ones at boot |

Fetch the tiers into the volume (resumable through `<name>.part` and HTTP Range, each file checked against its size
and pinned sha256; nothing goes into git or the image), by hand:

```sh
node packages/server/scripts/fetch-terrain.ts --list
node packages/server/scripts/fetch-terrain.ts --dir /data/terrain --tiers polar-south-20m,polar-south-80m,polar-south-240m,global-237m
```

The disk on Dokploy is a human decision: the volume needs the chosen tiers' bytes above plus `TERRAIN_CACHE_MB`.

### Deploying with every tier (VENT-43)

The server fills its own volume: with `TERRAIN_FETCH_TIERS` set it fetches, once it listens and in the background, the
tiers it lacks (`src/terrain/terrain-boot.ts`, `terrain-fetch.ts`, `file-fetch.ts`; the script above is a thin wrapper
over the same code). `all` goes smallest first (the 240 m, 80 m and 20 m polar caps, then the global grids), so the most
tiers serve the soonest; a list keeps its order and an unknown id is logged and skipped.

- One file at a time into `<name>.part`, continued with HTTP Range; the sha256 is checked against the catalogue's pin
  before the rename, and a tier with a file the catalogue has not pinned is refused with a log line. A cut keeps the
  part and is retried with backoff (5 s doubling to 5 min, 12 attempts); a hash that does not match deletes the part.
  A file that fails every attempt marks its tier `failed` and the next tier goes on. The answer is checked before a
  byte is written (`src/terrain/part-writer.ts`): a 206 must start where the part ends (else it is refused and the
  part kept), a 200 (a server that ignored the Range) replaces the part from byte 0, a 416 deletes the part, and a
  part larger than the file is deleted and fetched again. The bytes never go past the file's size: a server that
  sends more loses the request and the part. Only a whole, verified file is ever renamed into place.
- A tier whose files are all in place is picked up at once: the service re-scans the volume after each tier, with no
  restart. `/api/v1/health` stays ok throughout; serving never waits for the fetch.
- Disk check: before each file the server reads the volume's free space (`statfs`) and stops the fetch, with a log
  line, when the rest of the file and a 2 GB margin would not fit. It never fills the disk.
- One fetch per volume: the fetch holds `.fetch.lock` in `TERRAIN_DIR`, with its own token, and touches it every
  30 s while the lock is still its own; the release deletes it only then. A stop (SIGTERM, as `docker stop` and a
  redeploy send) aborts the fetch, keeps the `.part`, releases the lock and exits within 5 s, so the next start
  resumes at once. Only a killed process (SIGKILL, a crash) leaves its lock behind: it goes stale after 2 minutes
  untouched and the waiter checks every 30 s, so that restart waits between 2 and 2.5 minutes. The takeover moves the
  stale lock aside under a name of its own first, so of two servers only one takes it.
- Logs at info level, no secrets: a line when a file starts (tier, file, bytes from and total), its bytes at most
  every 30 s, the sha256 when it checks, and when a tier is installed.

On Dokploy (the API application):

| Mount | Kind | Path in the container |
|---|---|---|
| `ventana-lunar-terrain` | named volume | `/data/terrain` |
| `ventana-lunar-terrain-cache` | named volume | `/var/cache/terrain` |

Environment: `TERRAIN_DIR=/data/terrain` and `TERRAIN_FETCH_TIERS=all` (the image already sets
`TERRAIN_CACHE_DIR=/var/cache/terrain`). Every tier is about 48.6 GB; leave the margin's 2 GB on top.

**Volume ownership.** The server runs as `node`, but a named volume Docker created before the image had the directory
(or one a root process wrote) comes up owned by root, and Docker's copy-up of the image directory's owner is not to be
relied on. The image's entrypoint (`packages/server/docker-entrypoint.sh`) therefore starts as root, gives the top
directory of each mount (`TERRAIN_DIR`, `TERRAIN_CACHE_DIR`, `HORIZONS_CACHE_DIR`) to `node` when it is not already
(never a recursive chown over the 48 GB; only the fetch's own `*.part` and `.fetch.lock` at the top of the terrain
volume follow, regular files only, and `chown -h` never follows a symlink). It touches only paths under `/data/` or
`/var/cache/` without `..`: any other value is logged and left alone, so a variable set to `/` or `/etc` by mistake
never hands it to `node`. Then it drops to `node` for good with `su-exec` and runs the server. A mount it cannot change (read-only)
is said in the log; the server then logs «TERRAIN_DIR is not writable; nothing fetched», keeps serving what the volume
holds, and `/horizon` answers 503 while it holds no tier.

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

## `GET /api/v1/terrain/tile?lat&lon[&size]` (VENT-34)

The relief around a point for the 3D on-foot view. The human's decision: the view takes its relief only from our API.

- `lat`, `lon`: as `/horizon` (0.01° grid, `lon` east from -180 to 360).
- `size`: the side of the square in metres, `2000`, `4000` (default) or `8000`; any other value is a 400. Our choice:
  4 km is a few minutes' walk, and the three sizes bound the cache to three keys per point.

The tile is a fixed 257 x 257 grid (`n = 257`: 256 cells, a sample at the centre) in the local tangent plane centred on
the point, x east and y north. Sample `(row, col)` lies `x = -size/2 + col * step` east and `y = size/2 - row * step`
north of the centre, `step = size / 256` (7.8, 15.6 or 31.3 m). Its height is LOLA's at the point of the sphere under
it (the great circle of that distance and bearing from the centre), bilinear (`demHeightAt`), from the **finest tier
present that covers that sample**, the way the ray-march chooses (polar 20 m near the poles, then global 59 m, 80 m,
118 m, 237 m and so on by resolution). A tile that crosses the edge of the 20 m grid therefore mixes tiers, and the
answer says in what shares.

```json
{
  "lat": -84.79, "lonEast": 29.2, "sizeM": 4000, "n": 257,
  "groundM": 5321.3, "heights": "<base64>", "resolutionM": 20,
  "tiers": [{ "id": "polar-south-20m", "resolutionM": 20, "share": 1 }],
  "coverage": 1
}
```

- `heights`: `n * n` little-endian float32 values in metres, **relative to `groundM`** (the height of the centre sample,
  metres above the sphere of radius 1 737 400 m), row-major, rows from north to south, columns from west to east
  (`decodeHeights` of `@ventana/sim` reads it; the centre is index `128 * 257 + 128` and is 0). Heights are above the
  sphere, so the Moon's curvature is in them: against the tangent plane a flat surface falls by `d² / 2R` (9 m at the
  corner of an 8 km tile). A client drawing a flat mesh may subtract that, or leave it.
- `resolutionM`: the finest tier that served any sample. `tiers`: every tier that served samples and its share of them,
  finest first. **What is measured**: compare the sample spacing (`sizeM / 256`) with `resolutionM`. At 4 km and 59 m
  the spacing (15.6 m) is finer than the data, so the surface is smooth interpolation between measured points (a client
  may add detail but must not call it terrain); at 8 km on a polar 20 m tile the spacing (31 m) is coarser than the
  data and some of it is skipped.
- `coverage`: the share of samples some tier covered. A sample no tier covers (a partial install) is 0 m, that is
  `groundM`; with the global tier installed `coverage` is 1 everywhere.

Errors and limits are `/horizon`'s: 400 (bad `lat`, `lon` or `size`), 404 (no tier covers the centre), 429 (the same
per-address miss limiter: a computed tile counts as one new point), 503 (`{"error":"terrain data is not installed"}`
while no tier is on disk, or the computation queue is full, with `Retry-After`). Every `/api/*` error answer is logged as
one line (VENT-45). Success carries `Cache-Control: public, max-age=86400`. Tiles are computed in turn with the
horizons through the same gate (`TERRAIN_MAX_RUNNING`), read only the grid blocks they need through the same LRU, and are
cached on disk under a key of point, size and the tiers present, so a tier fetched later gives new tiles.

**Budget.** The body is 352 423 bytes of JSON (264 196 bytes of floats in base64, plus the fields); real relief
compresses little (gzip of floats), so a client should expect about 260 to 300 kB per tile over the wire. The API
gzips (or deflates) every JSON answer over 1 kB for a client that accepts it (Hono's `compress()`, `src/app.ts`;
no brotli, which `CompressionStream` lacks). At the default 512 MB the disk cache holds about 1 400 tiles. If that is too much, the next step is a
quantised form (int16 centimetres relative to `groundM`, half the size) as another serialiser over the same core,
`terrainTile`; it is not built. Measured on the test fixture (a 600 x 600 polar grid and a coarse globe, Node 22, cold
LRU): 110 to 150 ms per tile, two passes over 66 049 samples (a probe that notes the blocks, then the real one); a third
runs only when the real pass finds a block still missing (a sample read as a hole, NaN, that falls through to a
coarser tier whose blocks the probe never noted). Not measured on the real 48.6 GB volume.

## Aligned tiles with levels of detail (VENT-46)

The 4 km tile above is centred on the point, so a viewer that walks gets a new, unrelated tile every time. For relief
in rings out to 32 km (128 km on request) and for streaming while walking, the server also serves tiles of a **global,
deterministic tiling**: a tile is the same square of the Moon whoever asks, so two clients, a CDN and the disk cache
share it. The human's goal: the mid and far relief must look as good as the rest of the app.

### The tiling (our choices, with the reasons)

A fixed grid per anchor point would break sharing, and a grid in a local azimuthal frame is not shareable. So the tiles
sit on the **projection grids of the LOLA data themselves**:

| Scheme | Serves | Plane | A tile is |
|---|---|---|---|
| `polar-south`, `polar-north` | latitudes 60° to the pole | the polar stereographic plane of the PDS polar grids, true scale at the pole | a square of `2000 * 4^level` m of the plane |
| `latlon` | below 60° | the simple cylindrical grid of the global tiers | `1/16 * 4^level` degrees a side |

The scheme is chosen by the **anchor's** latitude (`schemeFor`: `|lat| >= 60`), so a view never mixes schemes; tiles of
a scheme exist wherever its keys are valid (`isTileKey`: polar tiles reaching within 45° of the pole, lat-lon tiles
below 75°). Our choice of 60° and not 80°: the stereographic plane is conformal (cells stay square on the ground; at
latitude φ the ground is `(1 + sin φ) / 2` of the plane, 0.93 at 60° and 0.998 at 85°), while a lat-lon cell is
`cos φ` as wide as it is tall (2:1 at 60°, 5.8:1 at 80°, which would make the cells of the south pole's sites
slivers). The polar grids are only the plane: heights come from the finest tier covering each node, polar or global.

**Levels.** Four, each tile 4 times the one below, every tile **129 x 129 samples** (128 cells):

| Level | Tile side | Node spacing | Typical use |
|---|---|---|---|
| 0 | 2 km (lat-lon: 1/16° = 1.9 km) | 15.6 m | the ground around the viewer |
| 1 | 8 km (1/4°) | 62.5 m | mid relief |
| 2 | 32 km (1°) | 250 m | far relief |
| 3 | 128 km (4°) | 1 km | the far horizon, on request |

Why 129: a 129-sample tile is a 128 x 128 mesh, 33 k triangles; 257 would be 131 k a tile, too many to draw a ring of
them on a laptop without a GPU. It is also 33 kB of 16-bit heights instead of 132. Why 15.6 m at level 0: it is the
native spacing of LOLA's 20 m polar grid (a finer mesh would be smooth interpolation, not terrain; the answer's
`resolutionM` says what is measured) and a power of two, so everything below is exact in a double.

**Alignment.** Tiles of a level **share their edge samples**: sample 128 of a tile is sample 0 of its neighbour, the
very same node, so heights agree bit for bit and a mesh has no crack between neighbours of a level. A node `(r, c)` of a
tile is also a node of the level above whenever `r` and `c` are multiples of 4, at the same place and with the same
height (`tests/tile-scheme.test.ts`, `tests/lod-tile.test.ts`): the parent's samples are every 4th sample of each of
its 16 children. **Between levels there are T-junctions**: the fine edge has 4 samples for each of the coarse one's, and
they differ between the shared nodes; the viewer hangs a skirt on each tile's edge, or snaps the fine edge's
in-between samples to the coarse edge's line. The tiling does not do it for the viewer. The 0° E seam is closed
(tile `x = 359` of level 2 ends at 360° E, which is 0° E), and a polar tile at the pole has the pole as the corner node
of four tiles.

Heights are a function of the node alone: from the first tier that covers it (bilinear, as the other routes do), so
the answer for a tile does not depend on which other tiles were asked, in what order, or when.

**Which tiers a level reads.** The finest data a level reads is a quarter of its node spacing (`minDataResolutionM`:
3.9, 15.6, 62.5 and 250 m): point-sampling 20 m data at a 250 m spacing aliases the relief and reads blocks for nothing,
and LOLA's coarse tiers are already averaged. So level 2 reads the 80 m polar tier (outside it the 118 m global one),
level 3 the 240 m ones, and a finer tier fills in only where the coarser ones do not cover (the
tiers a level may not use come last, coarsest first, `tiersForLevel`). The effect, by design (not measured on the real
volume): **every tile reads about the same**, a few blocks of 256 x 256 whatever its level, so it counts as one
computation for the gate and the limiter.

### The ring: `GET /api/v1/terrain/tiles?lat&lon[&levels]`

- `lat`, `lon`: as `/horizon` (0.01° grid, `lon` east from -180 to 360).
- `levels`: 1 to 4, default 3 (to 32 km). Our choice: three levels are about 27 tiles.

Level `L` covers a square of half-side one tile of that level around the point (2, 8, 32, 128 km). On the polar
plane that is at most 3 x 3 tiles a level; on the lat-lon grid, where a tile is narrower than it is tall, up to 6 x 3
at 60° (up to 20 tiles). Nearest first, the tile the point is in leading. Levels overlap (a coarse tile lies under the
finer ones); what to draw where, and where to cut holes, is the viewer's.

```json
{
  "lat": -85.87, "lonEast": 61.34, "scheme": "polar-south", "version": "3fa91c0b", "n": 129,
  "levels": [
    { "level": 0, "sizeM": 2000, "spacingM": 15.625, "tiles": [
      { "x": 3, "y": -2, "url": "/api/v1/terrain/tiles/polar-south/0/3/-2?v=3fa91c0b" } ] }
  ]
}
```

`version` is eight hex digits naming the tiers present (and the method). Answers with `Cache-Control: public,
max-age=300`; 400 (bad point or `levels`), 503 (`terrain data is not installed`). A client that wants the pure
function has it in `@ventana/sim`: `tilesAround({ latDeg, lonEastDeg }, levels)`, and `tileContaining(scheme, level,
lat, lon)` gives the tile under a point at any level, so a walking viewer can find the next tiles without the server.

### The tile: `GET /api/v1/terrain/tiles/{scheme}/{level}/{x}/{y}[?v=<version>]`

`scheme` is `polar-south`, `polar-north` or `latlon`; `level` 0 to 3; `x`, `y` whole numbers (negative allowed on the
polar plane). A tile `(x, y)` covers `[x * size, (x + 1) * size]` on each axis of the plane (X east, Y up, see below),
or `[x * size, (x + 1) * size]` degrees of east longitude and `[y * size, (y + 1) * size]` of latitude.

```json
{
  "version": "3fa91c0b", "scheme": "polar-south", "level": 0, "x": 3, "y": -2, "n": 129,
  "georef": { "kind": "polar", "pole": "south", "radiusM": 1737400, "minX": 6000, "maxY": -2000, "spacingM": 15.625 },
  "quantumM": 0.1, "baseUnits": -34210, "noData": 65535, "heights": "<base64>",
  "minM": -3421.04, "maxM": -2987.5,
  "resolutionM": 20, "tiers": [{ "id": "polar-south-20m", "resolutionM": 20, "share": 1 }], "coverage": 1
}
```

- **`heights`**: `n * n` little-endian **uint16** `q`, base64, rows from north to south (plane +Y), columns from west
  to east (plane +X). Height in metres above the sphere of radius 1 737 400 m: `h = (baseUnits + q) * quantumM`,
  and `q = 65535` (`noData`) is a node no tier covers. No ground reference: heights are absolute, so two tiles agree
  without knowing each other. `decodeQuantised(heights, quantumM, baseUnits)` of `@ventana/sim` reads it (NaN for no
  data). Why uint16 and not float32: the same tile is 33 kB of values instead of 66, and the step is 0.1 m
  (**an error of at most 0.05 m**, under the 0.1 m target and under LOLA's own 0.5 m DN step). The
  step is a constant and `baseUnits` a whole number of steps, not the tile's minimum, so a shared node decodes to the
  same height in every tile. When a tile's relief does not fit 65 534 steps (6.5 km at 0.1 m: only a 128 km tile over
  a very deep crater) the step doubles as often as it needs, `quantumM` says so and the error is at most half of it.
- **`georef`** places every sample exactly, in the local frame of the client's choice:
  - polar: sample `(row, col)` is at plane `X = minX + col * spacingM`, `Y = maxY - row * spacingM` metres; `pole`
    is the pole of the plane. Plane and sphere, as the PDS grids and `pixelOf` define them: with `k = 2R / (1 - z)`
    (south) or `2R / (1 + z)` (north) a unit vector `(p0, p1, z)` (x to 0° E, y to 90° E, z north) is at `X = k p1`,
    `Y = k p0` (south) or `Y = -k p0` (north). So 90° E is +X on both and 0° E is +Y at the south pole and -Y at the
    north. The inverse needs no trigonometry: `t = ρ / 2R`, `ρ = hypot(X, Y)`, the horizontal part of the unit vector is
    `2t / (1 + t²)` along `(±Y, X) / ρ` and `z = ∓(1 - t²) / (1 + t²)`. **Plane metres are not ground metres**: the
    ground is `(1 + sin |lat|) / 2` of the plane (0.998 at 85°); place the nodes with `sampleDirection`, not by
    multiplying the spacing.
  - lat-lon: `lat = northDeg - row * spacingDeg`, `lonEast = (westDeg + col * spacingDeg) mod 360`.
  - `sampleDirection(georef, row, col)` of `@ventana/sim` is the unit vector of a sample in both; the point on the Moon
    is that times `radiusM + h`. A viewer takes its anchor's unit vector `u` and builds the local east, north, up
    frame from it (up = `u`; the sphere's curvature is already in `h`, nothing to subtract).
- `resolutionM`, `tiers`, `coverage`: as the 4 km tile's. `minM`, `maxM`: the extremes, for bounding boxes and culling.
  Compare the node spacing (`spacingM` for polar tiles) with `resolutionM` to say what is measured.

**Cache.** `?v` is optional. Under the **current** version (`ETag: "<version>"`) the answer is
`Cache-Control: public, max-age=31536000, immutable`: tiles change only when a tier is installed (VENT-43), which
changes the token the ring route hands out. Without `v` it is `max-age=86400`; under a version that is no longer
current it is `max-age=300` (the answer is the current tiles, and says its `version`, so the client re-reads the ring).
`If-None-Match` with the current ETag answers **304** before the limiter and the gate: a revalidation costs nothing.

**Errors and limits.** 400 (bad scheme, level, `x`, `y` or `v`, or a key outside the grid of its scheme and level), 404
(no tier on this server covers a single node of the tile), 503 (`terrain data is not installed`, or the queue is full,
with `Retry-After: 10`), 429. Every `/api/*` error answer is logged as one line (VENT-45). The disk cache holds tiles
under `<TERRAIN_CACHE_DIR>/lod`, key = scheme, level, `x`, `y` and the version, so a new tier gives new tiles.

**Limits for streaming.** A computation counts against its own per-address limit (**600 per 10 minutes**, the
horizon's is 30; a ring of three levels is about 27 tiles), and goes through the same gate (`TERRAIN_MAX_RUNNING` at
once, 16 waiting, then 503): a client should keep at most **6 requests in flight** and fetch the ring in the order the
route lists it (nearest first); a retry waits `Retry-After`. Tiles read from the disk cache cost nothing.

**Budget.** The answer is 44.7 kB of JSON (33 282 bytes of `q`, 44 376 characters of base64, plus about 400 of fields):
a seventh of the 4 km tile's 352 kB. On a synthetic rough surface (a 400 m swell, a 25 m ripple and 0.8 m of noise,
worse than LOLA's) it gzips to 31.9 kB against 63.9 kB for the same tile in float32; the API gzips every JSON answer
over 1 kB. Measured on the test fixture (a 600 x 600 polar grid and a coarse globe, Node 22, cold LRU): 20 to 100 ms a
tile (a probing pass and a real one over 16 641 nodes), `tilesAround` 0.05 ms. Not measured on the real 48.6 GB volume.
A byte-plane shuffle of the 16-bit values (high bytes first) would shrink the gzip further; it is not built.

