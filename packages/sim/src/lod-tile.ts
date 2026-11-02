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
 * An aligned height tile (VENT-46): the heights at the nodes of one tile of
 * the global tiling (`tile-scheme.ts`), each read bilinearly from the first
 * of `grids` that has a height there, so a caller that lists the finest grid
 * first gets the finest data per node, as the horizon's ray-march does. A
 * node is a function of its place and the grids' order alone, so two tiles
 * read over the same grids in the same order hold the very same height at a
 * node they share, on an edge or across levels. A caller that reads each
 * level over a different order (the server does, so a coarse level is not
 * aliased by data finer than its spacing) gets heights that agree across
 * levels only approximately. Heights are metres above the sphere (absolute,
 * no ground reference); NaN where no grid
 * covers. Pure.
 */
import type { DemGrid } from './dem-grid.ts';
import { heightFrom } from './ray-march.ts';
import { sampleDirection, tileGeoref } from './tile-georef.ts';
import { TILE_SAMPLES, nominalSpacingM, type TileKey } from './tile-scheme.ts';

/** A data resolution finer than this share of the spacing is skipped. */
const SPACING_PER_DATUM = 4;

export interface AlignedTile {
  readonly key: TileKey;
  readonly n: number;
  /** `n * n` heights, rows from north, columns from west; NaN: no data. */
  readonly heights: Float32Array;
  /** How many samples some grid covered. */
  readonly covered: number;
  /** How many samples each grid answered, by grid id. */
  readonly stopsByGrid: Readonly<Record<string, number>>;
  readonly minM: number;
  readonly maxM: number;
}

/**
 * The finest data worth reading at `level`, metres a pixel: a quarter of the
 * level's node spacing. Finer data would be point-sampled, which aliases
 * the relief and reads more disk for nothing; the coarser LOLA tiers are
 * already averaged.
 */
export function minDataResolutionM(level: number): number {
  return nominalSpacingM(level) / SPACING_PER_DATUM;
}

/**
 * The tile `key` over `grids`, finest first.
 *
 * @throws RangeError when no grid covers a single node.
 */
export function alignedTile(
  grids: readonly DemGrid[],
  key: TileKey,
): AlignedTile {
  const georef = tileGeoref(key);
  const heights = new Float32Array(TILE_SAMPLES * TILE_SAMPLES);
  const counts = new Map<string, number>();
  let [covered, minM, maxM] = [0, Infinity, -Infinity];
  for (let row = 0; row < TILE_SAMPLES; row++) {
    for (let col = 0; col < TILE_SAMPLES; col++) {
      const { h, grid } = heightFrom(grids, sampleDirection(georef, row, col));
      const value = grid ? Math.fround(h) : Number.NaN;
      heights[row * TILE_SAMPLES + col] = value;
      if (!grid) continue;
      counts.set(grid.id, (counts.get(grid.id) ?? 0) + 1);
      covered += 1;
      minM = Math.min(minM, value);
      maxM = Math.max(maxM, value);
    }
  }
  if (covered === 0) throw new RangeError('no grid covers the tile');
  const stopsByGrid = Object.fromEntries([...counts].sort());
  return { key, n: TILE_SAMPLES, heights, covered, stopsByGrid, minM, maxM };
}
