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
 * The Earth's land as dots for the DSN pictures (VENT-7): the 1° land mask
 * baked from Natural Earth by `scripts/earth-land.mjs` (`land.json`), thinned
 * to one dot every `stride` degrees, fewer toward the poles so the dots stay
 * about as far apart on the sphere everywhere. Pure.
 */
import land from './land.json';

/** A point on the Earth, degrees. */
export interface GeoDot {
  readonly latDeg: number;
  readonly lonDeg: number;
}

/** The baked mask: runs of land cells per row of latitude, from the north. */
export interface LandMask {
  readonly step: number;
  readonly rows: readonly (readonly number[])[];
}

const DEG = Math.PI / 180;

/** The land cells of one row, as cell indices east from 180° W. */
function cellsOf(runs: readonly number[]): number[] {
  const cells: number[] = [];
  for (let i = 0; i + 1 < runs.length; i += 2) {
    const [first = 0, count = 0] = [runs[i], runs[i + 1]];
    for (let c = first; c < first + count; c++) cells.push(c);
  }
  return cells;
}

/**
 * The land as dots every `stride` cells in latitude, and every
 * `stride / cos(lat)` cells in longitude.
 */
export function landDots(stride: number, mask: LandMask = land): GeoDot[] {
  const dots: GeoDot[] = [];
  const { step, rows } = mask;
  for (let r = Math.floor(stride / 2); r < rows.length; r += stride) {
    const latDeg = 90 - (r + 0.5) * step;
    const spread = stride / Math.max(Math.cos(latDeg * DEG), 0.05);
    const every = Math.max(1, Math.round(spread));
    for (const c of cellsOf(rows[r] ?? [])) {
      const lonDeg = -180 + (c + 0.5) * step;
      if (c % every === 0) dots.push({ latDeg, lonDeg });
    }
  }
  return dots;
}
