# Ventana Lunar

> Landing at the lunar south pole is parking where the Sun lasts days and Earth disappears for weeks.
> Ventana Lunar tells you when and where you can.

**NASA Space Apps Challenge 2026** · challenge *Lunar Landing Site Navigator* · Madrid, 14-15 November 2026.

Pick a south pole landing site and a date range. Ventana Lunar shows, hour by hour, whether a lander there has
**Sun** (power), **sees Earth** (comms), or **both**: a landing window. It also shows which Deep Space Network antenna
is listening (Goldstone, Canberra or Robledo de Chavela, Madrid).

**Live:** https://nasa.cervilla.es · **Status:** in development. The tooling, CI and Dokploy deploy are in place; the product is being built on top.

## How it works

```text
JPL Horizons API ──► backend API (Dokploy, cached, no login) ──► site data ──► web app (Astro + React)
                                                                                ├─ calendar strip (MVP)
                                                                                ├─ 2D polar map (MVP)
                                                                                ├─ 3D globe (Three.js)
                                                                                └─ DSN mini globe
```

- **One backend, no login.** It queries JPL Horizons for the curated sites and for any custom coordinates, and caches
  every response, so the web answers in under 3 seconds. Deploying is a `git push` to `main`.
- **One clock.** A single store holds the selected site and the model time (UTC hour); every view reads it and none
  computes its own, so the globe and the strip can never disagree.

## Repository layout

| Path | What |
|---|---|
| `packages/web/src/pages/` | Astro pages (one screen) |
| `packages/web/src/components/` | React islands (strip, map, globe, card, DSN) |
| `packages/web/src/lib/` | Web-only TypeScript: store, formatting (unit-tested) |
| `packages/web/src/styles/` | Design tokens and global styles |
| `packages/sim/` | Pure TypeScript shared by web and server: site data contract, window logic (unit-tested) |
| `packages/server/` | Node API (Hono): JPL Horizons client, disk cache, `/api/v1/*` |
| `pipeline/` | The original data contract with JPL Horizons. `packages/server` owns the backend design now: VENT-3 built it there and VENT-10 (custom coordinates) extends it there |
| `packages/*/tests/`, `tests/e2e/` | Vitest (per package) and Playwright |
| `docs/diagrams/` | Architecture diagram |

## Develop

Requires Node 22 (`.nvmrc`). Production is two Dokploy apps: the root `Dockerfile` (static build served by unprivileged
nginx on port 8080, with the security headers of `nginx-security-headers.conf`) and `packages/server/Dockerfile` (the
API on port 3000, routed under `/api` on the same domain).

```sh
npm install
npm run dev          # http://localhost:4321/
npm run lint && npm run typecheck && npm test && npm run build && npm run e2e
```

## API

`packages/server` (Hono), all JSON under `/api/v1` (a future version can sit next to it):

| Route | Answers |
|---|---|
| `GET /api/v1/health` | `{ ok: true }` |
| `GET /api/v1/ephemeris?lat&lon&from&to[&at]` | Hourly Sun/Earth/DSN samples, landing windows and metrics for any point. `lon` is east longitude; `from`/`to` are UTC dates (`2026-11-01`) or whole UTC hours (`2026-11-01T05:00:00Z`), at most 92 days |
| `GET /api/v1/sites` | The 29 curated sites (`packages/server/data/sites.json`), in three groups: `south_pole`, `apollo`, `other` |
| `GET /api/v1/sites/:id[?from&to&at]` | One site, plus its ephemeris when given a range |

The point is rounded to a 0.01° grid (about 300 m on the Moon), so nearby points share their Horizons tables, and dates
must fall between 2026-01-01 and 2027-12-31 (400 otherwise). The Horizons tables of the curated sites and of the DSN
complexes are kept for good in `pinned/` under `HORIZONS_CACHE_DIR`; any other point goes to `points/`, capped at
`HORIZONS_POINTS_CACHE_MB` (default 512, set explicitly in the API image) with the least recently used tables evicted
first; the pinned tables, about 10 MB, do not count against that cap. Tables cached directly in
`HORIZONS_CACHE_DIR` by older versions are still read, never written. At most 2 Horizons downloads run at once for the
whole server and 32 wait; past that the API answers 503 with `Retry-After`. Each client IP may cause 30 Horizons
downloads (new points or months) per 10 minutes; past that it gets 429 with `Retry-After`, while cached answers keep
coming. Each Horizons call times out after 20 s. Sites with `approximate: true` have no citable coordinate: their point is a
stand-in (usually the IAU/USGS centre of the named feature), not a landing point, and `coordinateNote` says which. On
start the server warms the cache for every curated site over 2026-11-01 to 2026-12-31, in the background, 2 Horizons
requests at a time; `WARM_CACHE=0` skips it.

## Data sources

- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) (NASA/JPL): Sun and Earth azimuth/elevation from
  each lunar surface site; Moon elevation from each DSN complex.
- Landing sites: LROC/ASU, NASA, Wagner et al. 2017 and the other sources listed per site in
  `packages/server/data/sites.json`; stand-in points from the IAU/USGS Gazetteer of Planetary Nomenclature.

## Credits

Design guidance: the `apple-design` skill by Emil Kowalski (MIT), vendored in `.claude/skills/`.
