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
 * How clear a label stands of what is on the Moon (VENT-50): the site
 * markers, whose dot and, for the selected one, ring a label must not
 * touch, and the labels placed before it. Gaps in px; a negative gap is an
 * overlap. Pure.
 */
import type { Mark, ScreenPoint } from '../marker-cull';
import type { Box } from './disk';

/**
 * The room a label takes at the default text size, px: the longest
 * «90° W» at 10 px with its padding. The page measures the real box
 * (room.ts), which grows with the text size; this stands in until then.
 */
export const LABEL_BOX: Box = { width: 46, height: 16 };

/** What a label keeps clear of: a disc on the screen. */
export interface Obstacle {
  readonly at: ScreenPoint;
  readonly radius: number;
}

/** A marker's dot, px from its centre (globe.css `.globe-marker`). */
export const MARKER_RADIUS_PX = 7;
/** The selected site's ring with its halo (globe.css `.globe-ring`). */
export const RING_RADIUS_PX = 21;

/** The discs the markers cover: a dot each, a ring on the selected one. */
export function obstaclesOf(marks: readonly Mark[]): Obstacle[] {
  return marks.map(({ at, selected }) => ({
    at,
    radius: selected ? RING_RADIUS_PX : MARKER_RADIUS_PX,
  }));
}

/** The gap between the label `box` centred at `at` and `obstacle`. */
export function gapToObstacle(
  at: ScreenPoint,
  obstacle: Obstacle,
  box: Box = LABEL_BOX,
): number {
  const dx = Math.max(Math.abs(obstacle.at.x - at.x) - box.width / 2, 0);
  const dy = Math.max(Math.abs(obstacle.at.y - at.y) - box.height / 2, 0);
  return Math.hypot(dx, dy) - obstacle.radius;
}

/** The gap between the label boxes `box` centred at `a` and `b`. */
export function gapToLabel(
  a: ScreenPoint,
  b: ScreenPoint,
  box: Box = LABEL_BOX,
): number {
  return Math.max(
    Math.abs(a.x - b.x) - box.width,
    Math.abs(a.y - b.y) - box.height,
  );
}
