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
 * The ring nodes the fine tile covers (VENT-62): for each node of a level-0
 * tile inside the tile's box, the feather's weight and the fine height,
 * box-filtered over the node's spacing. Pure.
 */
import { tileGeoref } from '@ventana/sim';
import type { RingTile } from '../ring/ring-store';
import type { FineGrid } from './fine-load';

type Point = readonly [number, number];

/** Bilinear sample of `field` at plane `at`; the grid's pixel centres. */
export function sampleField(
  grid: FineGrid,
  field: Float32Array,
  at: Point,
): number {
  const { site, size } = grid;
  const c = (at[0] - site.ulx) / site.pixelM - 0.5;
  const r = (site.uly - at[1]) / site.pixelM - 0.5;
  const c0 = Math.max(0, Math.min(size - 2, Math.floor(c)));
  const r0 = Math.max(0, Math.min(size - 2, Math.floor(r)));
  const fc = Math.min(1, Math.max(0, c - c0));
  const fr = Math.min(1, Math.max(0, r - r0));
  const v = (rr: number, cc: number): number => field[rr * size + cc] ?? 0;
  return (v(r0, c0) * (1 - fc) + v(r0, c0 + 1) * fc) * (1 - fr)
    + (v(r0 + 1, c0) * (1 - fc) + v(r0 + 1, c0 + 1) * fc) * fr;
}

export interface Hit {
  readonly index: number;
  readonly weight: number;
  readonly fine: number;
}

/** The box-filtered fine height at `at`: nine samples `third` apart. */
function boxed(grid: FineGrid, at: Point, third: number): number {
  let sum = 0;
  for (const dy of [-third, 0, third]) {
    for (const dx of [-third, 0, third]) {
      sum += sampleField(grid, grid.heights, [at[0] + dx, at[1] + dy]);
    }
  }
  return sum / 9;
}

/** Whether plane `at` is inside the fine tile's box. */
function inside(grid: FineGrid, at: Point): boolean {
  const { site } = grid;
  const side = site.size * site.pixelM;
  return at[0] >= site.ulx && at[0] <= site.ulx + side
    && at[1] <= site.uly && at[1] >= site.uly - side;
}

/** The nodes of `tile` inside the fine tile, with their fine height. */
export function hitsOf(tile: RingTile, grid: FineGrid): Hit[] {
  const g = tileGeoref(tile.key);
  if (g.kind !== 'polar') return [];
  const hits: Hit[] = [];
  for (let i = 0; i < tile.n * tile.n; i++) {
    const at: Point = [g.minX + (i % tile.n) * g.spacingM,
      g.maxY - Math.floor(i / tile.n) * g.spacingM];
    const weight = inside(grid, at) ? sampleField(grid, grid.weights, at) : 0;
    if (weight > 0) {
      hits.push({ index: i, weight, fine: boxed(grid, at, g.spacingM / 3) });
    }
  }
  return hits;
}

