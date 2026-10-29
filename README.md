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
| `packages/server/` | Node API (Hono): JPL Horizons client, disk cache, `/api/*` |
| `pipeline/` | Data contract with JPL Horizons; `packages/server` implements it (VENT-3, VENT-10) |
| `packages/*/tests/`, `tests/e2e/` | Vitest (per package) and Playwright |
| `docs/diagrams/` | Architecture diagram |

## Develop

Requires Node 22 (`.nvmrc`) and, for the pipeline, Python 3. Production is the `Dockerfile` (static build served by
nginx) deployed on Dokploy.

```sh
npm install
npm run dev          # http://localhost:4321/
npm run lint && npm run typecheck && npm test && npm run build && npm run e2e
```

## Data sources

- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) (NASA/JPL): Sun and Earth azimuth/elevation from
  each lunar surface site; Moon elevation from each DSN complex.
- NASA CLPS and Artemis landing sites from the challenge resources.

## Credits

Design guidance: the `apple-design` skill by Emil Kowalski (MIT), vendored in `.claude/skills/`.
