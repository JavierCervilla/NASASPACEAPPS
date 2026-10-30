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

/**
 * Where the callout goes next to its marker (validated canvas «Globe ·
 * site callout»): above and to the right, its near edge a short leader
 * away; flipped left, then below, then both, when that side runs out of
 * the visible area or covers something the page keeps clear (the Layers
 * key, the phone's top bar and tab bar). When no side fits, the one that
 * spills least, slid inside the area. Pure.
 */
import { clampInto, holds, overflow, overlap, type Box, type Point } from './box';

/** From the marker's centre to the card's near edge, in px. */
const OFFSET_X_PX = 36;
/** The card's bottom sits this far above the marker (below: its top). */
const LIFT_PX = 4;
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

export interface CalloutPlace {
  /** The card's box. */
  readonly box: Box;
  readonly leader: Leader;
}

/** What the placement works with, in px in the globe host. */
export interface PlaceInput {
  /** The marker's centre. */
  readonly at: Point;
  readonly size: { readonly width: number; readonly height: number };
  /** The visible part of the globe the card stays inside. */
  readonly area: Box;
  /** What the card must not cover. */
  readonly avoid: readonly Box[];
}

/** The canvas's order: up-right, up-left, down-right, down-left. */
const SIDES = [
  { right: true, up: true },
  { right: false, up: true },
  { right: true, up: false },
  { right: false, up: false },
] as const;

type Side = (typeof SIDES)[number];

function cardBox(input: PlaceInput, side: Side): Box {
  const { at, size } = input;
  const left = side.right
    ? at.x + OFFSET_X_PX
    : at.x - OFFSET_X_PX - size.width;
  const top = side.up ? at.y - LIFT_PX - size.height : at.y + LIFT_PX;
  return { left, top, right: left + size.width, bottom: top + size.height };
}

function cost(input: PlaceInput, box: Box): number {
  const covered = input.avoid.reduce((sum, b) => sum + overlap(box, b), 0);
  return overflow(box, input.area) + covered;
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

function leaderTo(at: Point, box: Box): Leader {
  const end = edgePoint(at, box);
  const [dx, dy] = [end.x - at.x, end.y - at.y];
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { from: at, length: Math.hypot(dx, dy), angleDeg };
}

/**
 * The card's box and its leader for a marker at `input.at`; null when
 * the marker is outside the visible area (under the phone sheet).
 */
export function placeCallout(input: PlaceInput): CalloutPlace | null {
  if (!holds(input.area, input.at)) return null;
  const boxes = SIDES.map((side) => cardBox(input, side));
  const costs = boxes.map((box) => cost(input, box));
  const best = costs.indexOf(Math.min(...costs));
  const first = cardBox(input, SIDES[0]);
  const box = clampInto(boxes[best] ?? first, input.area);
  return { box, leader: leaderTo(input.at, box) };
}
