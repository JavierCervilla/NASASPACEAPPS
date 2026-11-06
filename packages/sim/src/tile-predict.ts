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
 * The 2D predictor of the binary tile (VENT-98): each 16-bit value is sent
 * as its difference from what its neighbours predict, the gradient
 * `left + up - upLeft` inside the tile, the left value along the first row
 * and the value above down the first column. On relief the differences are
 * small, so they gzip to about half of the raw values. Differences wrap
 * modulo 2^16 and are zigzagged (0, -1, 1, -2… to 0, 1, 2, 3…), so any
 * 16-bit input, no-data nodes included, comes back exactly. Measured on the
 * recorded LOLA tiles against left, up, average, Paeth and LOCO-I's median
 * predictor: the gradient was the smallest at every level but one, 3 %
 * behind there (docs/terrain-api.md). Pure.
 */

const WRAP = 0xff_ff;

/** What the nodes before `i` predict for node `i` of an `n`-wide grid. */
function predicted(values: ArrayLike<number>, i: number, n: number): number {
  const first = i % n === 0;
  if (i < n) return first ? 0 : (values[i - 1] as number);
  if (first) return values[i - n] as number;
  const [left, up] = [values[i - 1] as number, values[i - n] as number];
  return left + up - (values[i - n - 1] as number);
}

/** The zigzag code of the 16-bit wrapped difference `d`. */
function zigzag(d: number): number {
  const signed = ((d & WRAP) << 16) >> 16;
  return ((signed << 1) ^ (signed >> 15)) & WRAP;
}

/** The difference a zigzag code stands for. */
function unzigzag(z: number): number {
  return (z >>> 1) ^ -(z & 1);
}

/** The residuals of `q`, an `n` x `n` grid in reading order. */
export function predictResiduals(q: Uint16Array, n: number): Uint16Array {
  const residuals = new Uint16Array(q.length);
  for (let i = 0; i < q.length; i++) {
    residuals[i] = zigzag((q[i] as number) - predicted(q, i, n));
  }
  return residuals;
}

/** The values whose residuals are `residuals`: the inverse of the above. */
export function restoreHeights(residuals: Uint16Array, n: number): Uint16Array {
  const q = new Uint16Array(residuals.length);
  for (let i = 0; i < q.length; i++) {
    const d = unzigzag(residuals[i] as number);
    q[i] = (predicted(q, i, n) + d) & WRAP;
  }
  return q;
}
