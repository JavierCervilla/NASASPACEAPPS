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
 * Stubs the on-foot view's relief (VENT-34): `/api/v1/terrain/tile?lat&lon&size` answers a synthetic 257 x 257 tile
 * (docs/terrain-api.md: float32 little-endian heights in base64, metres relative to the centre, rows north to south),
 * gentle rolling ground with a ridge 40 m high 600 m to the south-east, read at 20 m. And, on request, the point's
 * terrain horizon with a wall where the spec wants one.
 */
import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

const N = 257;

/** The stub's ground at `east`, `north` metres from the centre. */
function heightAt(east: number, north: number): number {
  const rolling = 3 * Math.sin(east / 140) * Math.cos(north / 190);
  const along = (east - north) / Math.SQRT2;
  const across = (east + north) / Math.SQRT2;
  const ridge = 40 * Math.exp(-(((across - 0) / 60) ** 2)) * (along > 400 && along < 800 ? 1 : 0);
  return rolling + ridge;
}

/** The body of a tile of side `sizeM`. */
export function tileBody(url: URL): unknown {
  const sizeM = Number(url.searchParams.get('size') ?? 4000);
  const step = sizeM / (N - 1);
  const bytes = Buffer.alloc(N * N * 4);
  const centre = heightAt(0, 0);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const h = heightAt(-sizeM / 2 + col * step, sizeM / 2 - row * step) - centre;
      bytes.writeFloatLE(h, (row * N + col) * 4);
    }
  }
  const lat = Number(url.searchParams.get('lat'));
  const lonEast = Number(url.searchParams.get('lon'));
  const tiers = [{ id: 'polar-south-20m', resolutionM: 20, share: 1 }];
  return { lat, lonEast, sizeM, n: N, groundM: 1000, heights: bytes.toString('base64'), resolutionM: 20, tiers, coverage: 1 };
}

export interface TileStub {
  /** Other than 200 it answers an error. */
  readonly status?: number;
  readonly error?: string;
  /** Counts the requests. */
  readonly seen?: string[];
}

/** Routes `/api/v1/terrain/tile`. */
export async function stubTile(page: Page, stub: TileStub = {}): Promise<void> {
  await page.route(/\/api\/v1\/terrain\/tile\?/, async (route: Route) => {
    stub.seen?.push(route.request().url());
    const { status = 200, error = 'down' } = stub;
    if (status !== 200) return route.fulfill({ status, json: { error } });
    return route.fulfill({ json: tileBody(new URL(route.request().url())) });
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

/** A recorded answer of the live API, read as data and handed back byte for byte. */
const recorded = (name: string): string => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/**
 * REAL LOLA relief for IM-2 (84.79° S 29.20° E), recorded from the production API on 2026-11-02 and kept as data:
 * `fixtures/terrain-tile-im2-4000.json` (`/api/v1/terrain/tile?lat=-84.79&lon=29.2&size=4000`, 352 kB, sha256
 * 3dfd7fda…c670ac) and `fixtures/horizon-im2.json` (`/api/v1/horizon?lat=-84.79&lon=29.2`, 2 kB, sha256 422af242…d1e2).
 * Whatever point is asked, the answers are these.
 */
export async function stubRealRelief(page: Page): Promise<void> {
  const tile = recorded('terrain-tile-im2-4000.json');
  const horizon = recorded('horizon-im2.json');
  const json = (body: string) => (route: Route) => route.fulfill({ body, contentType: 'application/json' });
  await page.route(/\/api\/v1\/terrain\/tile\?/, json(tile));
  await page.route(/\/api\/v1\/horizon\?/, json(horizon));
}
