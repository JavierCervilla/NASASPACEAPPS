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
 * The read in rounds shared by the height tiles (VENT-34, VENT-46), as the
 * horizons read theirs (`horizon-rounds.ts`): the core is synchronous and
 * pure, the disk is not, so a first round probes (a missing block reads as
 * 0 m and is noted, so each sample stays on the finest grid that covers
 * it), then real rounds run until no block is missing.
 */
import type { BlockLoader } from './block-loader.ts';
import type { TierGrid } from './tier-grid.ts';

/** Rounds of the read: one probe, then real ones until nothing misses. */
const MAX_ROUNDS = 4;

/** `compute` over `grids`, once every block it needs has been read. */
export async function inRounds<T>(
  blocks: BlockLoader,
  grids: readonly TierGrid[],
  compute: () => T,
): Promise<T> {
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = compute();
    const misses = grids.some((g) => g.missing.size > 0);
    if (round > 0 && !misses) return result;
    await Promise.all(grids.map((g) => blocks.load(g)));
  }
  throw new Error('terrain: blocks still missing after every round');
}
