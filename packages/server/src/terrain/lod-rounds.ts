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
 * One levelled tile read in rounds (VENT-46), as `tile-rounds.ts` reads a
 * tile: the tiers a level reads, one grid each, probed and read until no
 * block is missing, then the answer.
 */
import type { BlockLoader } from './block-loader.ts';
import type { Tier } from './catalogue.ts';
import type { TileKey } from '@ventana/sim';
import { lodAnswer, lodTileOf, tiersForLevel, type LodAnswer } from './lod-answer.ts';
import { lodVersion } from './lod-version.ts';
import { inRounds } from './rounds.ts';
import type { TerrainService } from './terrain-service.ts';
import { TierGrid } from './tier-grid.ts';

/** What a read needs: the shared blocks and the tiers present. */
export interface LodRead {
  readonly blocks: BlockLoader;
  readonly present: readonly Tier[];
}

/** The tile `key` from the tiers of `read`. */
export async function readLod(
  read: LodRead,
  key: TileKey,
): Promise<LodAnswer> {
  const tiers = tiersForLevel(key.level, read.present);
  const grids = tiers.map((t) => new TierGrid(t));
  const demGrids = grids.map((g) => g.grid);
  const compute = () => lodTileOf(demGrids, key);
  const tile = await inRounds(read.blocks, grids, compute);
  return lodAnswer(tile, lodVersion(read.present), read.present);
}

/**
 * The tile `key`, in turn with the horizons and the other tiles (one gate),
 * from `present` (the caller's view of the tiers, so a cache key names the
 * tiers that answered) or the tiers present now.
 */
export function lodTileIn(
  service: TerrainService,
  key: TileKey,
  present: readonly Tier[] = service.present,
): Promise<LodAnswer> {
  const { blocks } = service;
  return service.gate.run(() => readLod({ blocks, present }, key));
}
