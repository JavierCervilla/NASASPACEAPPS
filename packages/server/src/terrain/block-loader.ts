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
 * Fills a request's tier grids with the blocks they missed (VENT-40): from
 * the shared LRU when there, else from disk, a batch at a time.
 */
import { BlockCache } from './block-cache.ts';
import { BlockReader } from './block-reader.ts';
import type { TierGrid } from './tier-grid.ts';

/** Blocks read at once. */
const READ_BATCH = 16;

export class BlockLoader {
  private readonly cache: BlockCache;
  private readonly reader: BlockReader;

  constructor(dir: string, cacheBytes: number) {
    this.cache = new BlockCache(cacheBytes);
    this.reader = new BlockReader(dir);
  }

  /** Reads the blocks `grid` missed and turns its probing off. */
  async load(grid: TierGrid): Promise<void> {
    const keys = [...grid.missing];
    grid.missing.clear();
    grid.probing = false;
    for (let i = 0; i < keys.length; i += READ_BATCH) {
      const batch = keys.slice(i, i + READ_BATCH);
      await Promise.all(
        batch.map(async (key) => {
          const name = `${grid.tier.id}/${key}`;
          const block =
            this.cache.get(name) ?? (await this.reader.read(grid.tier, key));
          this.cache.set(name, block);
          grid.blocks.set(key, block);
        }),
      );
    }
  }

  /** Bytes of blocks kept between requests. */
  cachedBytes(): number {
    return this.cache.size();
  }

  /** Closes the files. */
  close(): Promise<void> {
    return this.reader.close();
  }
}
