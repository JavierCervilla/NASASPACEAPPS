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
 * none on the astronaut's spot or under the lander. LOLA cannot see them:
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
  /** Discs kept clear: the lander's feet. */
  readonly clear: readonly { east: number; north: number; r: number }[];
}

/** Whether a rock at `east`, `north` stays off every clear disc. */
const isClear = (s: Scatter, east: number, north: number): boolean =>
  s.clear.every((c) => Math.hypot(east - c.east, north - c.north) > c.r);

/** The rocks of `seed`, the same every time. */
export function scatterRocks(seed: number, scatter: Scatter): Rock[] {
  const next = generator(seed);
  const rocks: Rock[] = [];
  const span = scatter.outerM - scatter.innerM;
  for (let tries = 0; rocks.length < scatter.count; tries++) {
    if (tries > scatter.count * 4) break;
    const d = scatter.innerM + Math.pow(next(), 1.5) * span;
    const az = next() * 2 * Math.PI;
    const [east, north] = [Math.sin(az) * d, Math.cos(az) * d];
    const diameter = 0.06 + Math.pow(next(), 5) * (MAX_ROCK_M - 0.06);
    const squash = 0.45 + next() * 0.35;
    const yawRad = next() * 2 * Math.PI;
    if (!isClear(scatter, east, north)) continue;
    rocks.push({ east, north, radius: diameter / 2, squash, yawRad });
  }
  return rocks;
}
