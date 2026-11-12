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
 * How far the eye may walk from the point (VENT-121): inside level 0's
 * window, the 4 km of 15.6 m relief already loaded around the point, less
 * its stitch band and a margin, so the ground under the eye is always the
 * finest relief and no tile is ever asked for. Level 0's window is 64
 * parent cells around the point's parent cell (ring-window.ts), so on its
 * near side it reaches at least 31 parent cells, 124 cells of 15.625 m.
 * Pure.
 */
import { TILE_CELLS } from '@ventana/sim';
import { BLEND_CELLS } from '../ring/ring-window';
import { localSize } from '../ring/ring-local';

/** Level 0's cell, metres: a 2 km tile of 128 cells. */
const CELL_M = localSize(0) / 2 / TILE_CELLS;
/** Level 0's cells from the point to the window's nearest edge, at least. */
const NEAR_EDGE_CELLS = (32 - 1) * 4;
/** Cells kept clear of the stitch band, for the view ahead of the eye. */
const MARGIN_CELLS = 20;

/** The eye's reach from the point, metres (1.5 km, the human was told). */
export const REACH_M =
  (NEAR_EDGE_CELLS - BLEND_CELLS - MARGIN_CELLS) * CELL_M;

/** Past this, metres, the eye is away from the point (the chip shows). */
export const AWAY_M = 5;

export type EastNorth = readonly [number, number];

/** `to`, held to the reach along the line from the point; `edge` if held. */
export function clampReach(to: EastNorth): { at: EastNorth; edge: boolean } {
  const d = Math.hypot(to[0], to[1]);
  if (d <= REACH_M) return { at: to, edge: false };
  const k = REACH_M / d;
  return { at: [to[0] * k, to[1] * k], edge: true };
}

/** Whether the eye at `at` is away from the point. */
export const isAway = (at: EastNorth): boolean =>
  Math.hypot(at[0], at[1]) > AWAY_M;
