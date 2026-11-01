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
 * `GET /api/v1/horizon?lat&lon[&height]` (VENT-40): the terrain's horizon
 * at any point, from the LOLA tiers the server has. The point is checked
 * and rounded to the 0.01° grid of `/ephemeris`; `height` is the eye above
 * the ground in metres (default 2, our choice for a lander deck), rounded
 * to 0.1 m. The answer names the tiers that served the rays, so a client
 * can say at what resolution the horizon was seen. A batch or binary form
 * would be another serialiser over {@link HorizonSource}.
 */
import type { Context } from 'hono';
import { clientIp } from '../client-ip.ts';
import {
  MissLimitError,
  limitMisses,
  type MissLimiter,
} from '../miss-limiter.ts';
import { ParamError, numberParam } from '../param-values.ts';
import { roundToGrid } from '../params.ts';
import type { HorizonSource } from './horizon-cache.ts';
import {
  TerrainBusyError,
  TerrainUncoveredError,
  type HorizonPoint,
} from './terrain-service.ts';

/** Our choice: a lander deck, 2 m above the ground. */
export const DEFAULT_HEIGHT_M = 2;
/** The highest eye the route takes, metres (a mast, not an orbit). */
export const MAX_HEIGHT_M = 100;
const BUSY_RETRY_AFTER_SEC = 10;
// A point's horizon changes only with the tiers on disk.
const CACHE_CONTROL = 'public, max-age=86400';

/** The raw query of the route. */
export interface RawHorizonParams {
  readonly lat?: string | undefined;
  readonly lon?: string | undefined;
  readonly height?: string | undefined;
}

/**
 * The checked point of a horizon request.
 *
 * @throws ParamError naming the first invalid parameter.
 */
export function parseHorizonParams(raw: RawHorizonParams): HorizonPoint {
  const lat = roundToGrid(numberParam('lat', raw.lat, -90, 90));
  const lonEast = roundToGrid(numberParam('lon', raw.lon, -180, 360));
  const height =
    raw.height === undefined
      ? DEFAULT_HEIGHT_M
      : numberParam('height', raw.height, 0, MAX_HEIGHT_M);
  return { lat, lonEast, heightM: Math.round(height * 10) / 10 };
}

/** The HTTP answer for an error of the route; rethrows the rest. */
function errorResponse(c: Context, error: unknown): Response {
  if (error instanceof ParamError) {
    return c.json({ error: error.message }, 400);
  }
  if (error instanceof MissLimitError) {
    c.header('Retry-After', String(error.retryAfterSec));
    const message = 'too many new points from this address; try again later';
    return c.json({ error: message }, 429);
  }
  if (error instanceof TerrainUncoveredError) {
    return c.json({ error: 'no terrain data covers this point' }, 404);
  }
  if (error instanceof TerrainBusyError) {
    c.header('Retry-After', String(BUSY_RETRY_AFTER_SEC));
    return c.json({ error: 'the service is busy; try again later' }, 503);
  }
  throw error;
}

/**
 * Answers a horizon request; 503 when the server has no terrain. A
 * computation counts against the client's miss limit, like a Horizons
 * download.
 */
export async function horizonResponse(
  c: Context,
  source: HorizonSource | undefined,
  missLimiter: MissLimiter,
): Promise<Response> {
  const onMiss = limitMisses(missLimiter, () => clientIp(c));
  if (!source) {
    return c.json({ error: 'terrain data is not installed' }, 503);
  }
  try {
    const point = parseHorizonParams(c.req.query());
    const answer = await source.horizon(point, onMiss);
    c.header('Cache-Control', CACHE_CONTROL);
    return c.json(answer);
  } catch (error) {
    return errorResponse(c, error);
  }
}
