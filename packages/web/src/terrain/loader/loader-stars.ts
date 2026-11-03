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
 * The skyline's faint stars (VENT-60, A): seeded, so a site always shows
 * the same sky, one per 2600 px² of the band, only above `topPx` (the
 * skyline's highest point less a margin). Pure.
 */
import type { Size } from './band-types';

const PX_PER_STAR = 2600;
/** Kept clear over the skyline, px. */
const CLEAR_PX = 30;

export interface Star {
  readonly x: number;
  readonly y: number;
  /** Side of its square, px. */
  readonly size: number;
  readonly opacity: number;
}

/** A linear congruential generator from `seed`, 0 to 1. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** The stars of `seed` over a band of `size`, above `topPx`. */
export function seededStars(seed: number, size: Size, topPx: number): Star[] {
  const random = lcg(seed);
  const count = Math.round((size.w * size.h) / PX_PER_STAR);
  const room = Math.max(topPx - CLEAR_PX, 0);
  return Array.from({ length: count }, () => ({
    x: random() * size.w,
    y: random() * room,
    size: 0.4 + random() * 0.7,
    opacity: 0.18 + random() * 0.45,
  }));
}
