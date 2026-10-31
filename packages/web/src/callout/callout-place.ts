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
 * Where the callout goes next to its marker (validated canvas «Globe ·
 * site callout»): above and to the right, its near edge a short leader
 * away; flipped left, then below, then both, when that side runs out of
 * the visible area or covers something the page keeps clear (the Layers
 * key, the phone's top bar and tab bar). Each side is judged as it would
 * be drawn, slid inside the area: a side that covers any of them is out,
 * and of the rest the one that had to slide least wins. No card while the
 * marker is outside the area, under something the page keeps clear, or
 * where every side would cover one of them (just below the tab bar).
 * The card keeps the side it sits on while that side stays clear, unless
 * another one slides clearly less: without that memory, a marker moving
 * near a tie flipped the card between two sides every frame (VENT-31).
 * Pure.
 */
import { clampInto, holds, overflow, overlap, type Box, type Point } from './box';
import { leaderTo, type Leader } from './callout-leader';

/** From the marker's centre to the card's near edge, in px. */
const OFFSET_X_PX = 36;
/** The card's bottom sits this far above the marker (below: its top). */
const LIFT_PX = 4;
/**
 * Another side takes over from the card's current one only when it has
 * to slide this much less, in px: near a tie the card stays put instead
 * of jumping between two sides frame after frame (VENT-31).
 */
const SWITCH_MARGIN_PX = 24;

/** Where the card sits relative to its marker. */
export type CalloutSide = 'up-right' | 'up-left' | 'down-right' | 'down-left';

export interface CalloutPlace {
  /** The card's box. */
  readonly box: Box;
  readonly leader: Leader;
  readonly side: CalloutSide;
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
  { name: 'up-right', right: true, up: true },
  { name: 'up-left', right: false, up: true },
  { name: 'down-right', right: true, up: false },
  { name: 'down-left', right: false, up: false },
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

/** How a side ranks: what it covers, then how far it had to slide. */
interface Rank {
  readonly side: CalloutSide;
  readonly box: Box;
  readonly covered: number;
  /** px² of the unslid card outside the area. */
  readonly spilled: number;
  /** px the card was slid by to fit the area. */
  readonly slide: number;
}

function rank(input: PlaceInput, side: Side): Rank {
  const raw = cardBox(input, side);
  const box = clampInto(raw, input.area);
  const covered = input.avoid.reduce((sum, b) => sum + overlap(box, b), 0);
  const slide =
    Math.abs(box.left - raw.left) + Math.abs(box.top - raw.top);
  const spilled = overflow(raw, input.area);
  return { side: side.name, box, covered, spilled, slide };
}

/**
 * The best side (least covered, then least spilled), unless `previous`
 * still covers nothing and the best one would not slide clearly less.
 */
function choose(
  ranks: readonly Rank[],
  previous: CalloutSide | null,
): Rank {
  const best = ranks.reduce((a, b) => {
    if (a.covered !== b.covered) return a.covered < b.covered ? a : b;
    return a.spilled <= b.spilled ? a : b;
  });
  const kept = ranks.find(({ side }) => side === previous);
  if (!kept || kept.covered > 0) return best;
  return best.slide <= kept.slide - SWITCH_MARGIN_PX ? best : kept;
}

/**
 * The card's box, its side and its leader for a marker at `input.at`;
 * null when the marker is outside the visible area (under the phone
 * sheet), under something the card must not cover (the phone's tab bar),
 * or where no side keeps clear of all of them. `previous` is the side
 * the card sits on now, kept while it stays clear (null: none yet).
 */
export function placeCallout(
  input: PlaceInput,
  previous: CalloutSide | null = null,
): CalloutPlace | null {
  const { at, area, avoid } = input;
  if (!holds(area, at) || avoid.some((b) => holds(b, at))) return null;
  const ranks = SIDES.map((side) => rank(input, side));
  const { box, covered, side } = choose(ranks, previous);
  if (covered > 0) return null;
  return { box, side, leader: leaderTo(at, box) };
}
