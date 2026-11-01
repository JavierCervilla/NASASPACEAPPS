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
 * Horizons of the terrain service kept on disk (VENT-40), like the
 * Horizons tables: a point's answer never changes for the same tiers, so
 * it is computed once and then read. Under a byte cap, least recently used
 * first out, and shared while in flight.
 */
import { DiskCache } from '../horizons/disk-cache.ts';
import { InFlight } from '../horizons/in-flight.ts';
import type {
  HorizonAnswer,
  HorizonPoint,
  TerrainService,
} from './terrain-service.ts';

/** What the horizon route needs: an answer for a point. */
export interface HorizonSource {
  /**
   * The horizon at `point`; `onMiss` runs before a computation (it may
   * throw to refuse it).
   */
  horizon(point: HorizonPoint, onMiss?: () => void): Promise<HorizonAnswer>;
}

/** Bumped when the method changes, so old answers are not served. */
const KEY_VERSION = 'v1';

/** The file name of a point's answer. */
export function horizonKey(point: HorizonPoint, tiers: string): string {
  const { lat, lonEast, heightM } = point;
  return `horizon-${KEY_VERSION}_${lat}_${lonEast}_h${heightM}_${tiers}`;
}

/** {@link TerrainService} behind a disk cache under `dir`. */
export function cachedHorizons(
  service: TerrainService,
  dir: string,
  maxBytes: number,
): HorizonSource {
  const disk = new DiskCache(dir, maxBytes);
  const inFlight = new InFlight<HorizonAnswer>();
  const tiers = service.present.map((t) => t.id).join('+');
  return {
    async horizon(point, onMiss) {
      const key = horizonKey(point, tiers);
      const hit = await disk.lookup(key);
      if (hit !== null) return JSON.parse(hit) as HorizonAnswer;
      onMiss?.();
      return inFlight.share(key, async () => {
        const answer = await service.horizon(point);
        await disk.store(key, JSON.stringify(answer), false);
        return answer;
      });
    },
  };
}
