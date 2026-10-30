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
 * The thin leader from the marker to the callout card: to the card's
 * nearer side edge, a little above (below) the marker, or straight up
 * (down) when the card was slid over the marker's column. Pure.
 */
import type { Box, Point } from './box';

/** The leader meets the card this far above (below) the marker. */
const LEADER_RISE_PX = 36;
/** The leader keeps clear of the card's rounded corners. */
const CORNER_PX = 22;

export interface Leader {
  /** Where it starts: the marker. */
  readonly from: Point;
  readonly length: number;
  /** Clockwise from the +x axis, in degrees. */
  readonly angleDeg: number;
}

/**
 * Where the leader meets the card: its nearer side edge, a little above
 * (below) the marker; or, when the card was slid over the marker's
 * column, straight up (down) to its bottom (top) edge.
 */
function edgePoint(at: Point, box: Box): Point {
  const above = box.bottom <= at.y;
  const over = at.x > box.left + CORNER_PX && at.x < box.right - CORNER_PX;
  if (over) return { x: at.x, y: above ? box.bottom : box.top };
  const nearLeft = Math.abs(at.x - box.left) <= Math.abs(at.x - box.right);
  const rise = above ? -LEADER_RISE_PX : LEADER_RISE_PX;
  const low = box.top + CORNER_PX;
  const y = Math.max(low, Math.min(at.y + rise, box.bottom - CORNER_PX));
  return { x: nearLeft ? box.left : box.right, y };
}

/** The leader from the marker at `at` to the card's `box`. */
export function leaderTo(at: Point, box: Box): Leader {
  const end = edgePoint(at, box);
  const [dx, dy] = [end.x - at.x, end.y - at.y];
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { from: at, length: Math.hypot(dx, dy), angleDeg };
}
