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
 * Levelled tiles of the terrain service kept on disk (VENT-46), as the
 * height tiles are (`tile-cache.ts`): a tile never changes for the same
 * tiers, so it is computed once and then read, under a byte cap, least
 * recently used first out, and shared while in flight. The key names the
 * tiers present through their version token.
 */
import type { TileKey } from '@ventana/sim';
import type { Tier } from './catalogue.ts';
import { DiskCache } from '../horizons/disk-cache.ts';
import { InFlight } from '../horizons/in-flight.ts';
import { TerrainNotInstalledError } from './horizon-cache.ts';
import type { LodAnswer } from './lod-answer.ts';
import { lodTileIn } from './lod-rounds.ts';
import { lodVersion } from './lod-version.ts';
import type { TerrainService } from './terrain-service.ts';

export { lodVersion } from './lod-version.ts';

/** What the levelled tile routes need. */
export interface LodSource {
  /**
   * The token of the tiers present now.
   *
   * @throws TerrainNotInstalledError while no tier is on disk.
   */
  version(): string;
  /**
   * The tile `key`; `onMiss` runs before a computation (it may throw to
   * refuse it).
   */
  tile(key: TileKey, onMiss?: () => void): Promise<LodAnswer>;
}

/** The file name of a tile under the version of the tiers present. */
export function lodKey(key: TileKey, version: string): string {
  const { scheme, level, x, y } = key;
  return `lod-${scheme}_${level}_${x}_${y}_${version}`;
}

/** The tiers present now. @throws TerrainNotInstalledError when none. */
function presentOf(service: TerrainService): readonly Tier[] {
  if (service.present.length === 0) throw new TerrainNotInstalledError();
  return service.present;
}

/** {@link TerrainService} levelled tiles behind a disk cache under `dir`. */
export function cachedLod(
  service: TerrainService,
  dir: string,
  maxBytes: number,
): LodSource {
  const disk = new DiskCache(dir, maxBytes);
  const inFlight = new InFlight<LodAnswer>();
  return {
    version: () => lodVersion(presentOf(service)),
    async tile(key, onMiss) {
      const present = presentOf(service);
      const file = lodKey(key, lodVersion(present));
      const hit = await disk.lookup(file);
      if (hit !== null) return JSON.parse(hit) as LodAnswer;
      onMiss?.();
      return inFlight.share(file, async () => {
        const answer = await lodTileIn(service, key, present);
        await disk.store(file, JSON.stringify(answer), false);
        return answer;
      });
    },
  };
}
