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
 * Normals from the positions around a node (VENT-46): the position at a
 * row and column of a ring tile, past the tile's edge from the neighbouring
 * tile when it is loaded, and the unit normal over a step of cells, one-sided
 * where a side is missing. Pure.
 */
import { TILE_CELLS, sampleDirection, tileGeoref } from '@ventana/sim';
import type { Vec3 } from '../view-camera';
import { cellOf } from './ring-cells';
import { toLocal, type Frame } from './ring-frame';
import { locate } from './ring-nodes';
import { stitchedHeight, type Stitch } from './ring-stitch';
import type { RingStore, RingTile } from './ring-store';

const N = TILE_CELLS + 1;

export interface Around {
  readonly store: RingStore;
  readonly frame: Frame;
  /** How the tile's level stitches its heights to its parent's. */
  readonly stitch?: Stitch | undefined;
}

type At = (row: number, col: number) => Vec3 | null;

/** The position at `row`, `col` of `tile`, past its edge from a neighbour. */
export function positionGetter(tile: RingTile, own: Float32Array, c: Around) {
  const { key } = tile;
  return (row: number, col: number): Vec3 | null => {
    if (row >= 0 && row < N && col >= 0 && col < N) {
      const i = (row * N + col) * 3;
      return [own[i] ?? 0, own[i + 1] ?? 0, own[i + 2] ?? 0];
    }
    const [cx, cy] = cellOf(key, row, col);
    const found = locate(c.store, key.level, cx, cy + 1);
    if (!found) return null;
    const h = stitchedHeight(found.tile, found.row, found.col, c.stitch);
    const georef = tileGeoref(found.tile.key);
    const dir = sampleDirection(georef, found.row, found.col);
    return toLocal(c.frame, dir, Number.isNaN(h) ? 0 : h);
  };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** The tangent along one axis at `step`, one-sided where a side is missing. */
function tangent(at: At, row: number, col: number, d: [number, number]) {
  const [dr, dc] = d;
  const before = at(row - dr, col - dc);
  const after = at(row + dr, col + dc);
  const here = at(row, col);
  if (before && after) return sub(after, before);
  if (here && after) return sub(after, here);
  return here && before ? sub(here, before) : null;
}

/** The unit normal over the step `s`, pointing up; null with no tangents. */
export function normalAt(
  at: At,
  row: number,
  col: number,
  s: number,
): Vec3 | null {
  const east = tangent(at, row, col, [0, s]);
  const south = tangent(at, row, col, [s, 0]);
  if (!east || !south) return null;
  const n: Vec3 = [east[1] * south[2] - east[2] * south[1],
    east[2] * south[0] - east[0] * south[2],
    east[0] * south[1] - east[1] * south[0]];
  const len = Math.hypot(...n) || 1;
  const sign = n[1] < 0 ? -1 : 1;
  return [(sign * n[0]) / len, (sign * n[1]) / len, (sign * n[2]) / len];
}

