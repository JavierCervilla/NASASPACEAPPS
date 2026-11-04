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
 * The fine relief on ring level 0 (VENT-62): every node of a level-0 tile
 * inside the fine tile moves toward the fine height by the feather's
 * weight. The fine height at a node is the mean of nine samples over the
 * node's spacing (a box filter, so the 5 m relief does not alias onto the
 * 15.6 m lattice), plus the vertical offset between the two sources, the
 * mean of LOLA minus fine over the first tile's nodes the fine tile
 * covers whole (the NAC DTMs are tied to LOLA to a fraction of a metre,
 * not exactly). The tiles of the store are never changed: a copy is made.
 * Pure.
 */
import type { RingTile } from '../ring/ring-store';
import { hitsOf, type Hit } from './fine-hits';
import type { FineGrid } from './fine-load';

/** The vertical offset, measured once per view. */
export interface FineOffset {
  value: number | null;
}

export const newOffset = (): FineOffset => ({ value: null });

/** Whole-weight nodes needed to trust the offset. */
const MIN_NODES = 50;

/** Sets `offset` from the whole-weight `hits` of `tile`, once. */
function measure(
  offset: FineOffset,
  tile: RingTile,
  hits: readonly Hit[],
): void {
  if (offset.value !== null) return;
  const whole = hits.filter((h) => h.weight > 0.99);
  if (whole.length < MIN_NODES) return;
  const gaps = whole.map((h) => (tile.heights[h.index] ?? 0) - h.fine);
  offset.value = gaps.reduce((a, b) => a + b, 0) / whole.length;
}

/** `tile` with the fine relief on it (the same tile when it has none). */
export function applyFine(
  tile: RingTile,
  grid: FineGrid,
  offset: FineOffset,
): RingTile {
  if (tile.key.level !== 0 || tile.key.scheme !== 'polar-south') return tile;
  const hits = hitsOf(tile, grid);
  if (hits.length === 0) return tile;
  measure(offset, tile, hits);
  const shift = offset.value ?? 0;
  const heights = Float32Array.from(tile.heights);
  for (const h of hits) {
    const lola = heights[h.index] ?? 0;
    heights[h.index] = lola + h.weight * (h.fine + shift - lola);
  }
  return { ...tile, heights };
}
