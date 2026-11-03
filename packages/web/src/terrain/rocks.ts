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
 * The illustrative rocks (VENT-34): smooth, rounded, all under 1 m, more
 * of the small ones, scattered round the point from its seed (seeded.ts),
 * none right under the eye. LOLA cannot see them:
 * the caption says so. Pure.
 */
import { generator } from './seeded';

export interface Rock {
  readonly east: number;
  readonly north: number;
  /** Metres, under {@link MAX_ROCK_M}. */
  readonly radius: number;
  /** Height over width, flatter than a ball. */
  readonly squash: number;
  readonly yawRad: number;
}

/** The largest rock, metres across: well under a metre, under LOLA's 20 m. */
export const MAX_ROCK_M = 0.6;

export interface Scatter {
  readonly count: number;
  /** The ring they lie in, metres from the point. */
  readonly innerM: number;
  readonly outerM: number;
}

/** The rocks of `seed`, the same every time. */
export function scatterRocks(seed: number, scatter: Scatter): Rock[] {
  const next = generator(seed);
  const rocks: Rock[] = [];
  const span = scatter.outerM - scatter.innerM;
  while (rocks.length < scatter.count) {
    const d = scatter.innerM + Math.pow(next(), 1.5) * span;
    const az = next() * 2 * Math.PI;
    const [east, north] = [Math.sin(az) * d, Math.cos(az) * d];
    const diameter = 0.06 + Math.pow(next(), 5) * (MAX_ROCK_M - 0.06);
    const squash = 0.45 + next() * 0.35;
    const yawRad = next() * 2 * Math.PI;
    rocks.push({ east, north, radius: diameter / 2, squash, yawRad });
  }
  return rocks;
}
