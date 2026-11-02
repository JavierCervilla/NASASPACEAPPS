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
 * The terrain routes of the API, mounted by `app.ts` under `/api/v1`: the
 * horizon, the height tile, the levelled tiles and the tiers' status.
 */
import type { Hono } from 'hono';
import {
  DEFAULT_SLOTS_RUNNING,
  DEFAULT_SLOTS_WAITING,
  IpSlots,
} from '../ip-slots.ts';
import type { MissLimiter } from '../miss-limiter.ts';
import type { TerrainStatusBody } from './fetch-status.ts';
import type { HorizonSource } from './horizon-cache.ts';
import { horizonResponse } from './horizon-route.ts';
import type { LodSource } from './lod-cache.ts';
import { lodIndexResponse, lodTileResponse } from './lod-route.ts';
import type { TileSource } from './tile-cache.ts';
import { tileResponse } from './tile-route.ts';

/** What the terrain routes need; each source is absent without terrain. */
export interface TerrainRouteDeps {
  readonly terrain?: HorizonSource | undefined;
  readonly tiles?: TileSource | undefined;
  readonly lod?: LodSource | undefined;
  readonly terrainStatus?: (() => TerrainStatusBody) | undefined;
  readonly missLimiter: MissLimiter;
  readonly lodLimiter: MissLimiter;
  /** Caps the levelled tiles one address has in flight; has defaults. */
  readonly lodSlots?: IpSlots | undefined;
}

/** Adds the terrain routes to `v1`. */
export function mountTerrain(v1: Hono, deps: TerrainRouteDeps): void {
  const lodSlots =
    deps.lodSlots ??
    new IpSlots({
      running: DEFAULT_SLOTS_RUNNING,
      waiting: DEFAULT_SLOTS_WAITING,
    });
  // Any point: lat and lon (east longitude) in degrees, optional height.
  v1.get('/horizon', (c) => horizonResponse(c, deps.terrain, deps.missLimiter));

  // Any point: lat and lon (east longitude) in degrees, optional size.
  v1.get('/terrain/tile', (c) => tileResponse(c, deps.tiles, deps.missLimiter));

  // The tiles of a ring around a point, then one tile (VENT-46).
  v1.get('/terrain/tiles', (c) => lodIndexResponse(c, deps.lod));
  v1.get('/terrain/tiles/:scheme/:level/:x/:y', (c) =>
    lodTileResponse(c, deps.lod, deps.lodLimiter, lodSlots),
  );

  // Tier ids, states and byte counts only: no paths.
  v1.get('/terrain/status', (c) =>
    c.json(deps.terrainStatus?.() ?? { fetch: 'off', tiers: [] }),
  );
}
