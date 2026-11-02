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
 * The tile's shadows from the Sun (VENT-34), per vertex: a sample is in
 * shadow when the ground toward the Sun rises above the line to it within
 * the tile. Hard, as the Moon's are. The terrain beyond the tile is the
 * far horizon's (ridge.ts, applied to the whole view). Pure.
 */
import type { HeightTile } from './tile';
import { stepOf } from './tile-mesh';
import { direction } from './view-camera';

const RAD = Math.PI / 180;
/** Under this the Sun lights nothing in the tile: the sphere's dip. */
const NIGHT_DEG = -3;

/** The highest height of the mesh. */
const highest = (ys: Float32Array): number =>
  ys.reduce((a, b) => Math.max(a, b), -Infinity);

/**
 * 1 for each vertex the Sun at `azDeg`, `elDeg` reaches within the tile,
 * 0 for each in shadow; only the `slice`'s rows (from, to exclusive) into
 * its array when given, so a big grid is shaded in slices.
 */
export function sunLit(
  tile: HeightTile,
  ys: Float32Array,
  { azDeg, elDeg }: { azDeg: number; elDeg: number },
  slice?: { into: Float32Array; rows: readonly [number, number] },
): Float32Array {
  const { n } = tile;
  const lit = slice?.into ?? new Float32Array(n * n);
  const [from, to] = slice?.rows ?? [0, n];
  if (elDeg < NIGHT_DEG) return lit.fill(0, from * n, to * n);
  const [dx, , dz] = direction(azDeg, 0);
  const rise = Math.tan(elDeg * RAD);
  const top = highest(ys);
  for (let i = from * n; i < to * n; i++) {
    const shade = { col: i % n, row: Math.floor(i / n), y: ys[i] ?? 0 };
    lit[i] = reaches(tile, ys, shade, { dx, dz, rise, top }) ? 1 : 0;
  }
  return lit;
}

interface Ray {
  readonly dx: number;
  readonly dz: number;
  readonly rise: number;
  readonly top: number;
}

/** Whether the ray from a sample toward the Sun leaves the tile clear. */
function reaches(
  tile: HeightTile,
  ys: Float32Array,
  from: { col: number; row: number; y: number },
  ray: Ray,
): boolean {
  const { n } = tile;
  const step = stepOf(tile);
  for (let k = 1; ; k++) {
    const [c, r] = [from.col + ray.dx * k, from.row + ray.dz * k];
    const line = from.y + ray.rise * k * step + 0.05;
    if (c < 0 || r < 0 || c > n - 1 || r > n - 1 || line > ray.top) {
      return true;
    }
    if ((ys[Math.round(r) * n + Math.round(c)] ?? 0) > line) return false;
  }
}
