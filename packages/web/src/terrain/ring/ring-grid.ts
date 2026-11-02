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
 * A ring tile placed in the session's frame (VENT-46): the position of each
 * of its nodes (the sample's unit vector from `sampleDirection`, at its
 * height, in ring-frame.ts), whether its rows and columns run
 * counter-clockwise seen from above, and the smooth normals (ring-normals.ts).
 * No data (NaN) is placed at 0 m so the buffers hold no NaN; the cells it
 * touches are never drawn (`validCells`). Pure and transferable.
 */
import { TILE_CELLS, sampleDirection, tileGeoref } from '@ventana/sim';
import type { Frame } from './ring-frame';
import { toLocal } from './ring-frame';
import { stitchAt, stitchedHeight, type Stitch } from './ring-stitch';
import type { RingTile } from './ring-store';

const N = TILE_CELLS + 1;

/**
 * x, y, z of every node, row-major as the tile, its heights stitched to
 * the parent's where it has one (ring-stitch.ts). With `previous`, the
 * positions of an earlier call: only the stitched nodes are placed again.
 */
export function gridPositions(
  tile: RingTile,
  frame: Frame,
  stitch?: Stitch,
  previous?: Float32Array,
): Float32Array {
  const georef = tileGeoref(tile.key);
  const out = previous ?? new Float32Array(N * N * 3);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (previous && stitchAt(tile, row, col, stitch) === 0) continue;
      const h = stitchedHeight(tile, row, col, stitch);
      const dir = sampleDirection(georef, row, col);
      const at = toLocal(frame, dir, Number.isNaN(h) ? 0 : h);
      out.set(at, (row * N + col) * 3);
    }
  }
  return out;
}

/**
 * Whether a cell's triangles `(a, c, b)` face up: the tile's rows run from
 * its north edge, so the polar plane's mirrored axes may flip it.
 */
export function facesUp(positions: Float32Array): boolean {
  const at = (row: number, col: number): number[] => {
    const i = (row * N + col) * 3;
    return [positions[i] ?? 0, positions[i + 1] ?? 0, positions[i + 2] ?? 0];
  };
  const [a, b, c] = [at(64, 64), at(64, 65), at(65, 64)];
  const ex = (b[0] ?? 0) - (a[0] ?? 0);
  const ez = (b[2] ?? 0) - (a[2] ?? 0);
  const sx = (c[0] ?? 0) - (a[0] ?? 0);
  const sz = (c[2] ?? 0) - (a[2] ?? 0);
  return sz * ex - sx * ez > 0;
}

/** Per cell, 1 when its four corners have data. */
export function validCells(tile: RingTile): Uint8Array {
  const cells = TILE_CELLS;
  const out = new Uint8Array(cells * cells);
  const ok = (row: number, col: number): boolean =>
    !Number.isNaN(tile.heights[row * N + col] ?? Number.NaN);
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const all = ok(row, col) && ok(row, col + 1) &&
        ok(row + 1, col) && ok(row + 1, col + 1);
      out[row * cells + col] = all ? 1 : 0;
    }
  }
  return out;
}
