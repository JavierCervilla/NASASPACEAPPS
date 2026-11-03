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
 * A tile shaded from its own heights for the loader's plan (VENT-60, B):
 * lit from the Sun's azimuth at 35°, its relief raised 2.5 times at level
 * 0 and 1.5 times above (the canvas's), grey from 18 to 223, a node with
 * no data left clear. The slopes are read along the tile's own axes and
 * turned onto east and north, so any scheme is lit from the right side.
 * One tile is about 17 k nodes, a job of a few ms for the slicer. Pure.
 */
import { LUNAR_RADIUS_M, TILE_CELLS, sampleDirection, tileGeoref,
  type TileKey } from '@ventana/sim';
import type { Frame } from '../ring/ring-frame';
import type { RingTile } from '../ring/ring-store';
import { dot } from '../vec3';
import type { Point } from './band-types';

const RAD = Math.PI / 180;
const SUN_ALTITUDE = 35 * RAD;
const LIFT = { near: 2.5, far: 1.5 } as const;
const [DARK, SPAN, FULL, GAMMA] = [18, 205, 0.82, 1.35];

/** A cell step along the tile's columns and rows: east and north, m. */
export interface Axes {
  readonly col: Point;
  readonly row: Point;
}

/** The cell steps of `key` around the site of `frame`. */
export function tileAxes(key: TileKey, frame: Frame): Axes {
  const g = tileGeoref(key);
  const at = (row: number, col: number): Point => {
    const dir = sampleDirection(g, row, col);
    return [dot(dir, frame.east) * LUNAR_RADIUS_M,
      dot(dir, frame.north) * LUNAR_RADIUS_M];
  };
  const [o, c, r] = [at(0, 0), at(0, TILE_CELLS), at(TILE_CELLS, 0)];
  const step = (p: Point): Point =>
    [(p[0] - o[0]) / TILE_CELLS, (p[1] - o[1]) / TILE_CELLS];
  return { col: step(c), row: step(r) };
}

/** The matrix that turns slopes per cell into slopes east and north. */
function slopeTurn({ col, row }: Axes): number[] {
  const det = col[0] * row[1] - col[1] * row[0];
  return [row[1] / det, -col[1] / det, -row[0] / det, col[0] / det];
}

/** The node's height, or `fallback` where it has none or is outside. */
function heightOr(t: RingTile, r: number, c: number, fallback: number) {
  if (r < 0 || c < 0 || r >= t.n || c >= t.n) return fallback;
  const h = t.heights[r * t.n + c] ?? Number.NaN;
  return Number.isNaN(h) ? fallback : h;
}

/** The grey of a node whose slopes per cell are `gc` and `gr`. */
function greyOf(gc: number, gr: number, m: number[], light: number[]) {
  const [a = 0, b = 0, c = 0, d = 0, lift = 1] = m;
  const east = (a * gc + b * gr) * lift;
  const north = (c * gc + d * gr) * lift;
  const [le = 0, ln = 0, lz = 0] = light;
  const lit = (lz - east * le - north * ln) / Math.hypot(east, north, 1);
  const v = Math.min(1, Math.max(0, lit) / FULL) ** GAMMA;
  return Math.round(DARK + SPAN * v);
}

/** RGBA, `n` x `n`, of `tile` lit from `sunAzDeg`. */
export function shadeTile(
  tile: RingTile,
  axes: Axes,
  sunAzDeg: number,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(tile.n * tile.n * 4);
  const m = [...slopeTurn(axes), tile.key.level === 0 ? LIFT.near : LIFT.far];
  const light = [Math.sin(sunAzDeg * RAD) * Math.cos(SUN_ALTITUDE),
    Math.cos(sunAzDeg * RAD) * Math.cos(SUN_ALTITUDE), Math.sin(SUN_ALTITUDE)];
  for (let i = 0; i < tile.n * tile.n; i++) {
    const [r, c] = [Math.floor(i / tile.n), i % tile.n];
    const h = heightOr(tile, r, c, Number.NaN);
    if (Number.isNaN(h)) continue;
    const gc = (heightOr(tile, r, c + 1, h) - heightOr(tile, r, c - 1, h)) / 2;
    const gr = (heightOr(tile, r + 1, c, h) - heightOr(tile, r - 1, c, h)) / 2;
    const grey = greyOf(gc, gr, m, light);
    out.set([grey, grey, grey, 255], i * 4);
  }
  return out;
}
