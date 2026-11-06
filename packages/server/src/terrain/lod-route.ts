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
 * The levelled tile routes (VENT-46), `GET /api/v1/terrain/tiles?lat&lon
 * [&levels]` (which tiles cover a ring around a point, level by level) and
 * `GET /api/v1/terrain/tiles/{scheme}/{level}/{x}/{y}[?v]` (one tile): see
 * docs/terrain-api.md. A tile's url carries the version token of the tiers
 * that served it, so under the current token it is immutable; a computation
 * counts against the client's tile limit, apart from the horizon's, and
 * holds one of the client's few slots while it runs.
 */
import { tilesAround, TILE_SAMPLES } from '@ventana/sim';
import type { Context } from 'hono';
import { clientIp } from '../client-ip.ts';
import type { IpSlots } from '../ip-slots.ts';
import { limitMisses, type MissLimiter } from '../miss-limiter.ts';
import { CACHE_CONTROL, NOT_INSTALLED, errorResponse } from './horizon-route.ts';
import type { LodAnswer } from './lod-answer.ts';
import type { LodSource } from './lod-cache.ts';
import { formatQuery, tileBody } from './lod-body.ts';
import {
  parseFormat, parseIndexParams, parseTileKey, parseVersion,
} from './lod-params.ts';

const TILES_PATH = '/api/v1/terrain/tiles';
/** A tile under the current version never changes. */
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** The ring and a tile under a stale token: the tiers may have grown. */
const SHORT = 'public, max-age=300';
/**
 * A full tile queue drains in tenths of a second, and the parent level
 * stands in for a missing tile meanwhile, so the client may come back soon
 * (VENT-78: the horizon's 10 s held a tile 10 to 15 s on a phone).
 */
export const TILE_BUSY_RETRY_SEC = 2;

/** The `Cache-Control` of a tile asked under `asked`, served under `served`. */
function cacheControlOf(asked: string | undefined, served: string): string {
  if (asked === undefined) return CACHE_CONTROL;
  return asked === served ? IMMUTABLE : SHORT;
}

function matches(header: string | undefined, version: string): boolean {
  const tag = `"${version}"`;
  return (header ?? '').split(',').some((t) => t.trim().replace(/^W\//, '') === tag);
}

function notModified(c: Context, cacheControl: string, version: string) {
  c.header('ETag', `"${version}"`);
  c.header('Cache-Control', cacheControl);
  return c.body(null, 304);
}

/** Answers a tile request; 503 when the server has no terrain. */
export async function lodTileResponse(
  c: Context,
  source: LodSource | undefined,
  limiter: MissLimiter,
  slots: IpSlots,
): Promise<Response> {
  if (!source) return c.json({ error: NOT_INSTALLED }, 503);
  try {
    const key = parseTileKey(c.req.param());
    const asked = parseVersion(c.req.query('v'));
    const format = parseFormat(c.req.query('format'));
    const current = source.version();
    if (matches(c.req.header('If-None-Match'), current)) {
      return notModified(c, cacheControlOf(asked, current), current);
    }
    const onMiss = limitMisses(limiter, () => clientIp(c));
    const slot = () => slots.acquire(clientIp(c));
    const answer: LodAnswer = await source.tile(key, onMiss, slot);
    c.header('ETag', `"${answer.version}"`);
    c.header('Cache-Control', cacheControlOf(asked, answer.version));
    return tileBody(c, answer, format);
  } catch (error) {
    return errorResponse(c, error, TILE_BUSY_RETRY_SEC);
  }
}

/** Answers the ring request: the keys and urls to fetch, nearest first. */
export function lodIndexResponse(
  c: Context,
  source: LodSource | undefined,
): Response {
  if (!source) return c.json({ error: NOT_INSTALLED }, 503);
  try {
    const { lat, lonEast, levels, format } = parseIndexParams(c.req.query());
    const version = source.version();
    const plan = tilesAround({ latDeg: lat, lonEastDeg: lonEast }, levels);
    const url = ({ scheme, level, x, y }: (typeof plan.levels)[0]['tiles'][0]) =>
      `${TILES_PATH}/${scheme}/${level}/${x}/${y}?v=${version}` +
      formatQuery(format);
    const rings = plan.levels.map(({ tiles, ...ring }) => ({
      ...ring,
      tiles: tiles.map((t) => ({ x: t.x, y: t.y, url: url(t) })),
    }));
    c.header('Cache-Control', SHORT);
    const { scheme } = plan;
    const n = TILE_SAMPLES;
    return c.json({ lat, lonEast, scheme, version, n, levels: rings });
  } catch (error) {
    return errorResponse(c, error);
  }
}
