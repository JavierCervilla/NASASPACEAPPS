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
 * A tier as one grid for the ray-march (VENT-40), over the blocks one
 * request has in hand. The ray-march is synchronous and pure, the disk is
 * not, so a request runs it twice: first probing (a missing block reads
 * as 0 m and is noted, so the rays stay on the finest grid that covers
 * them and note exactly the blocks they cross), then, with those blocks
 * read, for real (a missing block is then a hole, NaN, and is noted
 * again for another round).
 */
import type { DemGrid } from '@ventana/sim';
import { BLOCK_SIZE, type Block } from './block-cache.ts';
import type { Tier } from './catalogue.ts';

/** Blocks per row of the key space; more than any tier has. */
const KEY_STRIDE = 1 << 16;

/** The block number of a pixel. */
export function blockOf(line: number, sample: number): number {
  const bl = Math.floor(line / BLOCK_SIZE);
  return bl * KEY_STRIDE + Math.floor(sample / BLOCK_SIZE);
}

/** The first line and sample of a block number. */
export function blockOrigin(key: number): [number, number] {
  const bl = Math.floor(key / KEY_STRIDE);
  return [bl * BLOCK_SIZE, (key - bl * KEY_STRIDE) * BLOCK_SIZE];
}

/** Width in samples of the block starting at `sample0` of `tier`. */
export function blockWidth(tier: Tier, sample0: number): number {
  return Math.min(BLOCK_SIZE, tier.samples - sample0);
}

/** A tier's grid over the blocks this request holds and misses. */
export class TierGrid {
  readonly blocks = new Map<number, Block>();
  readonly missing = new Set<number>();
  /** While true, a missing block reads as 0 m; else as NaN. */
  probing = true;
  readonly grid: DemGrid;
  readonly tier: Tier;

  constructor(tier: Tier) {
    this.tier = tier;
    const { id, lines, samples, projection, metresPerDn, radiusM } = tier;
    const meta = { id, lines, samples, projection, metresPerDn, radiusM };
    this.grid = { ...meta, dnAt: (l, s) => this.dnAt(l, s) };
  }

  private dnAt(line: number, sample: number): number {
    const key = blockOf(line, sample);
    const block = this.blocks.get(key);
    if (block === undefined) {
      this.missing.add(key);
      return this.probing ? 0 : Number.NaN;
    }
    const [l0, s0] = blockOrigin(key);
    const width = blockWidth(this.tier, s0);
    return block[(line - l0) * width + (sample - s0)] ?? Number.NaN;
  }
}
