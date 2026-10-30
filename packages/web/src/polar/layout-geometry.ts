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
 * The px geometry the polar map's label and badge layouts share: where a
 * dot falls on the map, the room it keeps clear, and whether two boxes
 * overlap. Pure.
 */
import type { MapPoint } from '../lib/polar-projection';

/** A box in px on the map. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Half the side of the room a dot keeps clear of labels and badges. */
const DOT_HALF_PX = 7;

/** Whether boxes `a` and `b` overlap. */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

/** The px point of `at` on a map `size` px wide. */
export function toPx(at: MapPoint, size: number): MapPoint {
  return { x: ((1 + at.x) / 2) * size, y: ((1 + at.y) / 2) * size };
}

/**
 * The box a dot at `dot` (px) keeps clear of labels and badges, `half`
 * its half side (larger for the selected dot and its ring).
 */
export function dotBox(dot: MapPoint, half = DOT_HALF_PX): Box {
  return {
    left: dot.x - half,
    right: dot.x + half,
    top: dot.y - half,
    bottom: dot.y + half,
  };
}
