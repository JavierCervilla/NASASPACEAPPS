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
 * Height tiles of the terrain service kept on disk (VENT-34), as the
 * horizons are (`horizon-cache.ts`): a tile never changes for the same
 * tiers, so it is computed once and then read, under a byte cap, least
 * recently used first out, and shared while in flight. The key names the
 * tiers present, and the service answers from those very tiers.
 */
import { DiskCache } from '../horizons/disk-cache.ts';
import { InFlight } from '../horizons/in-flight.ts';
import { normaliseLonEast } from '../horizons/query.ts';
import { roundToGrid } from '../params.ts';
import { TerrainNotInstalledError } from './horizon-cache.ts';
import type { TileAnswer, TilePoint } from './tile-answer.ts';
import type { TerrainService } from './terrain-service.ts';
import { tileIn } from './tile-rounds.ts';

/** What the tile route needs: an answer for a point. */
export interface TileSource {
  /**
   * The tile at `point`; `onMiss` runs before a computation (it may throw
   * to refuse it).
   */
  tile(point: TilePoint, onMiss?: () => void): Promise<TileAnswer>;
}

/** Bumped when the method changes, so old answers are not served. */
const KEY_VERSION = 'v1';

/**
 * The file name of a point's tile. The longitude is wrapped to [0, 360)
 * on the 0.01° grid (wrapping alone leaves 180.01999… for 180.02), so 0
 * and 360, or -180 and 180, are one entry.
 */
export function tileKey(point: TilePoint, tiers: string): string {
  const { lat, sizeM } = point;
  const lonEast = roundToGrid(normaliseLonEast(point.lonEast));
  return `tile-${KEY_VERSION}_${lat}_${lonEast}_s${sizeM}_${tiers}`;
}

/** {@link TerrainService} tiles behind a disk cache under `dir`. */
export function cachedTiles(
  service: TerrainService,
  dir: string,
  maxBytes: number,
): TileSource {
  const disk = new DiskCache(dir, maxBytes);
  const inFlight = new InFlight<TileAnswer>();
  return {
    async tile(point, onMiss) {
      const present = service.present;
      if (present.length === 0) throw new TerrainNotInstalledError();
      const key = tileKey(point, present.map((t) => t.id).join('+'));
      const hit = await disk.lookup(key);
      if (hit !== null) return JSON.parse(hit) as TileAnswer;
      onMiss?.();
      return inFlight.share(key, async () => {
        const answer = await tileIn(service, point, present);
        await disk.store(key, JSON.stringify(answer), false);
        return answer;
      });
    },
  };
}
