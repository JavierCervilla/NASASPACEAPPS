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
 * One horizon read in rounds (VENT-40): the ray-march is synchronous and
 * pure, the disk is not, so a probe notes the blocks the rays cross (see
 * `tier-grid.ts`), then real rounds run until no block is missing.
 */
import type { BlockLoader } from './block-loader.ts';
import type { BandSpec, Tier } from './catalogue.ts';
import {
  answer,
  bandsOf,
  march,
  type HorizonAnswer,
  type HorizonPoint,
} from './horizon-answer.ts';
import { TierGrid } from './tier-grid.ts';

/** Rounds of the read: one probe, then real ones until nothing misses. */
const MAX_ROUNDS = 4;

/** What a read needs: the shared blocks, the bands and the tiers. */
export interface HorizonRead {
  readonly blocks: BlockLoader;
  readonly bands: readonly BandSpec[];
  readonly present: readonly Tier[];
}

/** The horizon at `point` from the tiers of `read`. */
export async function readHorizon(
  read: HorizonRead,
  point: HorizonPoint,
): Promise<HorizonAnswer> {
  const grids = new Map(read.present.map((t) => [t.id, new TierGrid(t)]));
  const bands = bandsOf(read.bands, grids);
  const { lat, lonEast, heightM } = point;
  const observer = { latDeg: lat, lonEastDeg: lonEast, heightM };
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = march(bands, observer);
    const all = [...grids.values()];
    const misses = all.some((g) => g.missing.size > 0);
    if (round > 0 && !misses) return answer(point, result, read.present);
    await Promise.all(all.map((g) => read.blocks.load(g)));
  }
  throw new Error('terrain: blocks still missing after every round');
}
