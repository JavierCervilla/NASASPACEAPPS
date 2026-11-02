/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * Stubs the on-foot view's relief (VENT-34, VENT-46): the ring route
 * `/api/v1/terrain/tiles?lat&lon&levels` and the tile route
 * `/api/v1/terrain/tiles/{scheme}/{level}/{x}/{y}` (docs/terrain-api.md),
 * answered by the simulator's own pure core (`tilesAround`, `alignedTile`,
 * the 16-bit codec) over a synthetic polar grid: rolling ground, a 40 m ridge
 * 600 m from the point and two mountains, 15 and 60 km away, for the mid and far
 * rings. And, on request, the point's terrain horizon with a wall where the spec
 * wants one.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  alignedTile, encodeQuantised, planePoint, quantiseHeights, tilesAround,
  type DemGrid, type TileKey, type TileScheme,
} from '@ventana/sim';
import type { Page, Route } from '@playwright/test';

const R = 1_737_400;
const SIDE = 40_000;
const MPP = 20;
const POLE = (SIDE - 1) / 2;
const DN_M = 0.1;
const POINT_PLANE = planePoint('south', -85.5, 40);

/** The synthetic ground at plane metres `x`, `y`. */
function heightAt(x: number, y: number): number {
  const [east, north] = [x - POINT_PLANE[0], y - POINT_PLANE[1]];
  const rolling = 3 * Math.sin(east / 140) * Math.cos(north / 190);
  const along = (east - north) / Math.SQRT2;
  const across = (east + north) / Math.SQRT2;
  const ridge = 40 * Math.exp(-(((across - 0) / 60) ** 2)) * (along > 400 && along < 800 ? 1 : 0);
  const near = 1800 * Math.exp(-(((east - 15_000) / 3_500) ** 2 + ((north + 3_000) / 4_000) ** 2));
  const far = 3200 * Math.exp(-(((east + 60_000) / 12_000) ** 2 + ((north - 20_000) / 15_000) ** 2));
  return rolling + ridge + near + far;
}

const GRID: DemGrid = {
  id: 'synthetic-polar', lines: SIDE, samples: SIDE, metresPerDn: DN_M, radiusM: R,
  projection: { kind: 'polar', pole: 'south', poleLine: POLE, poleSample: POLE, metresPerPixel: MPP },
  dnAt: (line, sample) => heightAt((sample - POLE) * MPP, (POLE - line) * MPP) / DN_M,
};

const VERSION = 'stub0001';
const tileUrlOf = (k: TileKey): string => `/api/v1/terrain/tiles/${k.scheme}/${k.level}/${k.x}/${k.y}?v=${VERSION}`;

/** The ring route's body for a point. */
export function ringBody(url: URL): unknown {
  const lat = Number(url.searchParams.get('lat'));
  const lonEast = Number(url.searchParams.get('lon'));
  const levels = Number(url.searchParams.get('levels') ?? 3);
  const plan = tilesAround({ latDeg: lat, lonEastDeg: lonEast }, levels);
  const rows = plan.levels.map((l) => ({
    level: l.level, sizeM: l.sizeM, spacingM: l.spacingM,
    tiles: l.tiles.map((k) => ({ x: k.x, y: k.y, url: tileUrlOf(k) })),
  }));
  return { lat, lonEast, scheme: plan.scheme, version: VERSION, n: 129, levels: rows };
}

const cache = new Map<string, unknown>();

/** The tile route's body for a key. */
export function tileBodyOf(key: TileKey): unknown {
  const name = `${key.scheme}/${key.level}/${key.x}/${key.y}`;
  const hit = cache.get(name);
  if (hit) return hit;
  const tile = alignedTile([GRID], key);
  const q = quantiseHeights(tile.heights);
  const body = {
    version: VERSION, scheme: key.scheme, level: key.level, x: key.x, y: key.y, n: tile.n,
    quantumM: q.quantumM, baseUnits: q.baseUnits, noData: 65_535, heights: encodeQuantised(q),
    minM: tile.minM, maxM: tile.maxM, resolutionM: 20,
    tiers: [{ id: 'polar-south-20m', resolutionM: 20, share: 1 }], coverage: 1,
  };
  cache.set(name, body);
  return body;
}

export interface TileStub {
  /** Other than 200 it answers an error. */
  readonly status?: number;
  readonly error?: string;
  /** The ring list answers 200 but every tile answers this error. */
  readonly tileStatus?: number;
  /** Collects the requests. */
  readonly seen?: string[];
}

const TILE_PATH = /\/api\/v1\/terrain\/tiles\/(polar-south|polar-north|latlon)\/(\d+)\/(-?\d+)\/(-?\d+)/;

/** Routes the ring and tile routes to the synthetic relief. */
export async function stubTile(page: Page, stub: TileStub = {}): Promise<void> {
  await page.route(/\/api\/v1\/terrain\/tiles/, async (route: Route) => {
    const url = new URL(route.request().url());
    stub.seen?.push(url.pathname + url.search);
    const { status = 200, error = 'down' } = stub;
    if (status !== 200) return route.fulfill({ status, json: { error } });
    const m = TILE_PATH.exec(url.pathname);
    if (!m) return route.fulfill({ json: ringBody(url) });
    if (stub.tileStatus) return route.fulfill({ status: stub.tileStatus, json: { error } });
    const key = { scheme: m[1] as TileScheme, level: Number(m[2]), x: Number(m[3]), y: Number(m[4]) };
    return route.fulfill({ json: tileBodyOf(key) });
  });
}

/** A horizon of 0.5° all round with a 12° wall from `fromDeg` to `toDeg`. */
export function wallHorizon(fromDeg: number, toDeg: number): unknown {
  const bytes = Buffer.alloc(720 * 2);
  for (let i = 0; i < 720; i++) {
    const az = i / 2;
    bytes.writeInt16LE(az >= fromDeg && az <= toDeg ? 1200 : 50, i * 2);
  }
  const tiers = [{ id: 'polar-south-20m', resolutionM: 20, share: 1 }];
  return { heightM: 2, bins: 720, profile: bytes.toString('base64'), groundM: 1000, coverage: 1, tiers };
}

/** Routes `/api/v1/horizon` to a wall from `fromDeg` to `toDeg`. */
export async function stubWall(page: Page, fromDeg: number, toDeg: number): Promise<void> {
  await page.route(/\/api\/v1\/horizon\?/, (route) => route.fulfill({ json: wallHorizon(fromDeg, toDeg) }));
}

const DIR = new URL('./fixtures/terrain-ring-im2/', import.meta.url);
const recorded = (name: string): string => readFileSync(new URL(name, DIR), 'utf8');
const RECORD = process.env.VENT46_RECORD;

/** The tile route's fixture file name. */
const fileOf = (m: RegExpExecArray): string => `tile-${m[1]}-${m[2]}-${m[3]}-${m[4]}.json`;

/** Records one answer of the local server into the fixtures, returning it. */
async function record(path: string, name: string): Promise<string> {
  mkdirSync(DIR, { recursive: true });
  const body = await (await fetch(`${RECORD}${path}`)).text();
  writeFileSync(new URL(name, DIR), body);
  return body;
}

/**
 * REAL LOLA relief for IM-2 (84.79° S 29.20° E), recorded from the levelled tile routes (docs/terrain-api.md,
 * `VENT46_RECORD=<server url>` records again) of a local server over NASA's LDEM_80S_80M and LDEM_75S_240M, the real
 * data this container holds (the 20 m tier is not here, so the near ground is 80 m data read at 15.6 m: smoother than
 * production's); the production API does not serve the route yet. Whatever point is asked, the answers are these.
 * The horizon is the recorded one of IM-2 (`fixtures/horizon-im2.json`).
 */
export async function stubRealRelief(page: Page): Promise<void> {
  const horizon = readFileSync(new URL('./fixtures/horizon-im2.json', import.meta.url), 'utf8');
  const json = (body: string) => (route: Route) => route.fulfill({ body, contentType: 'application/json' });
  await page.route(/\/api\/v1\/horizon\?/, json(horizon));
  await page.route(/\/api\/v1\/terrain\/tiles/, async (route) => {
    const url = new URL(route.request().url());
    const m = TILE_PATH.exec(url.pathname);
    try {
      if (!m) {
        const query = '?lat=-84.79&lon=29.2&levels=4';
        return await json(RECORD ? await record(`/api/v1/terrain/tiles${query}`, 'ring.json') : recorded('ring.json'))(route);
      }
      const body = RECORD ? await record(url.pathname + url.search, fileOf(m)) : recorded(fileOf(m));
      return await json(body)(route);
    } catch {
      return route.fulfill({ status: 404, json: { error: 'no terrain data covers this point' } });
    }
  });
}
