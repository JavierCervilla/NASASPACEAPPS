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
 * `GET /api/v1/terrain/tile?lat&lon[&size]` (VENT-34): the relief around
 * a point for the 3D view, from the LOLA tiers the server has. The point
 * is checked and rounded as `/horizon` does; `size` is the side of the
 * square in metres, one of 2000, 4000 (the default) and 8000. The answer
 * is a 257 x 257 height grid (docs/terrain-api.md); a computation counts
 * against the client's miss limit and errors answer as `/horizon` does.
 */
import type { Context } from 'hono';
import { clientIp } from '../client-ip.ts';
import { limitMisses, type MissLimiter } from '../miss-limiter.ts';
import { ParamError, numberParam } from '../param-values.ts';
import { roundToGrid } from '../params.ts';
import { CACHE_CONTROL, NOT_INSTALLED, errorResponse } from './horizon-route.ts';
import type { TilePoint } from './tile-answer.ts';
import type { TileSource } from './tile-cache.ts';

/** The sides a tile may have, metres. */
export const TILE_SIZES_M: readonly number[] = [2_000, 4_000, 8_000];
/** Our choice: 4 km, a walk of a few minutes at 16 m a sample. */
export const DEFAULT_TILE_SIZE_M = 4_000;

/** The raw query of the route. */
export interface RawTileParams {
  readonly lat?: string | undefined;
  readonly lon?: string | undefined;
  readonly size?: string | undefined;
}

function sizeParam(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_TILE_SIZE_M;
  const size = Number(raw.trim() === '' ? Number.NaN : raw);
  if (!TILE_SIZES_M.includes(size)) {
    throw new ParamError(`"size" must be one of ${TILE_SIZES_M.join(', ')}`);
  }
  return size;
}

/**
 * The checked point of a tile request.
 *
 * @throws ParamError naming the first invalid parameter.
 */
export function parseTileParams(raw: RawTileParams): TilePoint {
  const lat = roundToGrid(numberParam('lat', raw.lat, -90, 90));
  const lonEast = roundToGrid(numberParam('lon', raw.lon, -180, 360));
  return { lat, lonEast, sizeM: sizeParam(raw.size) };
}

/** Answers a tile request; 503 when the server has no terrain. */
export async function tileResponse(
  c: Context,
  source: TileSource | undefined,
  missLimiter: MissLimiter,
): Promise<Response> {
  const onMiss = limitMisses(missLimiter, () => clientIp(c));
  if (!source) {
    return c.json({ error: NOT_INSTALLED }, 503);
  }
  try {
    const point = parseTileParams(c.req.query());
    const answer = await source.tile(point, onMiss);
    c.header('Cache-Control', CACHE_CONTROL);
    return c.json(answer);
  } catch (error) {
    return errorResponse(c, error);
  }
}
