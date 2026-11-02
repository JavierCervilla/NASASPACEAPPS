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
 * Reading and tidying a local grid (VENT-46): the bilinear read of a grid
 * of the session's frame at metres east and north, and the filling of the
 * nodes no tile covered. Pure.
 */
import { LOCAL_N } from './ring-local';

/** Replaces NaN with the nearest earlier value in reading order (or 0). */
export function fillGaps(ys: Float32Array): void {
  let last = ys.find((v) => !Number.isNaN(v)) ?? 0;
  for (let i = 0; i < ys.length; i++) {
    if (Number.isNaN(ys[i] ?? 0)) ys[i] = last;
    else last = ys[i] ?? last;
  }
}

/** Bilinear read of a local grid at `east`, `north`; `outside` beyond it. */
export function readGrid(
  values: Float32Array,
  sizeM: number,
  at: readonly [number, number],
  outside: number,
): number {
  const half = sizeM / 2;
  const [east, north] = at;
  if (Math.abs(east) >= half || Math.abs(north) >= half) return outside;
  const step = sizeM / (LOCAL_N - 1);
  const [fx, fy] = [(east + half) / step, (half - north) / step];
  const [col, row] = [Math.min(Math.floor(fx), LOCAL_N - 2),
    Math.min(Math.floor(fy), LOCAL_N - 2)];
  const [u, v] = [fx - col, fy - row];
  const g = (r: number, c: number): number => values[r * LOCAL_N + c] ?? 0;
  const top = g(row, col) * (1 - u) + g(row, col + 1) * u;
  const low = g(row + 1, col) * (1 - u) + g(row + 1, col + 1) * u;
  return top * (1 - v) + low * v;
}
