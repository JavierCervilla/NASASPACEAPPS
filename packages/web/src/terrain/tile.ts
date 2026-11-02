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
 * A height tile of the API (`GET /api/v1/terrain/tile`, VENT-34,
 * docs/terrain-api.md) as the on-foot view reads it: an `n` x `n` grid of
 * heights in metres relative to the point's ground, rows north to south,
 * columns west to east, centred on the point. Pure: the URL, and the
 * check of an answer's body.
 */
import { decodeHeights } from '@ventana/sim';
import type { LatLon } from '../lib/polar-projection';
import { snapPoint } from '../pin/custom-point';
import { offsetFrom } from './site-offset';

/** Our choice (the human's): a 4 km square, 15.6 m between samples. */
export const TILE_SIZE_M = 4_000;

/**
 * One tile as the scene takes it: transferable numbers only (a Web Worker
 * may build it), placed by `key` in the session's local frame (metres
 * east and north of the site the view opened on, which is the origin), so
 * tiles can later sit side by side.
 */
export interface HeightTile {
  /** Names the tile: the scene keeps, replaces and frees tiles by it. */
  readonly key: string;
  /** The tile's centre, metres east and north of the session's origin. */
  readonly originEast: number;
  readonly originNorth: number;
  /** Samples per side; the centre is sample `(n - 1) / 2`. */
  readonly n: number;
  /** The square's side, metres. */
  readonly sizeM: number;
  /** Row-major heights, metres above the centre's ground. */
  readonly heights: Float32Array;
  /** The finest LOLA grid that served any sample, metres. */
  readonly resolutionM: number;
}

/**
 * Where the view's tiles come from: the seam of the streaming to come
 * (VENT-34 C to E: aligned tiles with LOD from the server, a Web Worker
 * streamer, walking). Today one main-thread source fetches one tile
 * centred on the point and decodes its base64 itself; a worker source
 * may replace it, delivering the same transferable {@link HeightTile}s,
 * and the scene does not change.
 */
export interface TileSource {
  /** The tile of `sizeM` around `point`; rejects as horizon-errors.ts. */
  readonly get: (point: LatLon, sizeM: number) => Promise<HeightTile>;
}

/** The sites endpoint's sibling for any point's tile. */
const SITES_PATH = /\/sites$/;

/** The URL of the tile around `point`, on the server's 0.01° grid. */
export function tileUrl(
  sitesUrl: string,
  point: LatLon,
  sizeM: number,
): string {
  const at = snapPoint(point) ?? point;
  const query = new URLSearchParams({
    lat: at.lat.toFixed(2),
    lon: at.lonEast.toFixed(2),
    size: String(sizeM),
  });
  return `${sitesUrl.replace(SITES_PATH, '/terrain/tile')}?${query}`;
}

interface Answer {
  readonly n?: unknown;
  readonly sizeM?: unknown;
  readonly heights?: unknown;
  readonly resolutionM?: unknown;
  readonly lat?: unknown;
  readonly lonEast?: unknown;
}

/** Whether `value` is a whole number from 2 up. */
const isSide = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 2;

/**
 * The tile in the API's answer, or null when it is not one: a side that
 * is not a number, heights that do not decode or do not fill the grid.
 * The API centres it on the 0.01° grid, so it is placed by where that
 * centre lies from `site`, which stays at the origin.
 */
export function tileOf(body: unknown, site: LatLon): HeightTile | null {
  const answer = (body ?? {}) as Answer;
  const { n, sizeM, heights, resolutionM } = answer;
  if (!isSide(n) || typeof heights !== 'string') return null;
  if (typeof sizeM !== 'number' || !(sizeM > 0)) return null;
  if (typeof resolutionM !== 'number') return null;
  const { lat, lonEast } = answer;
  if (!Number.isFinite(lat) || !Number.isFinite(lonEast)) return null;
  try {
    const values = decodeHeights(heights);
    if (values.length !== n * n) return null;
    const key = `${String(answer.lat)},${String(answer.lonEast)},${sizeM}`;
    const centre = { lat: Number(lat), lonEast: Number(lonEast) };
    const { east, north } = offsetFrom(site, centre);
    const origin = { originEast: east, originNorth: north };
    return { key, ...origin, n, sizeM, heights: values, resolutionM };
  } catch {
    return null;
  }
}
