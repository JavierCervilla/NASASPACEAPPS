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
 * Where the horizon strip's labels go (VENT-40): beside their dot, to the
 * left near the right edge. Two labels that would touch (the Sun and the
 * Earth at close azimuths) go to opposite sides, the left dot's to its
 * left and the right dot's to its right, so they part along the strip;
 * where an edge leaves no room for that, they part up and down, kept
 * inside the strip. Pure.
 */
import {
  ASCENT_EM,
  DESCENT_EM,
  SPACE_EM,
  beside,
  boxOf,
  fits,
  touch,
  type LabelFrame,
  type LabelPlace,
  type Labelled,
} from './label-box';

export type { LabelFrame, LabelPlace, Labelled };

/** The default place: to the right, or to the left where it cannot fit. */
function placeOne(item: Labelled, frame: LabelFrame): LabelPlace {
  const right = beside(item, 'start', frame);
  return fits(boxOf(item, right, frame), frame)
    ? right
    : beside(item, 'end', frame);
}

/** Two baselines moved apart by a line, both kept inside the strip. */
function stacked(
  [a, b]: readonly [LabelPlace, LabelPlace],
  frame: LabelFrame,
): [LabelPlace, LabelPlace] {
  const line = (ASCENT_EM + DESCENT_EM + SPACE_EM) * frame.fontPx;
  const upper = a.labelY <= b.labelY ? 0 : 1;
  const mid = (a.labelY + b.labelY) / 2;
  const least = ASCENT_EM * frame.fontPx;
  const most = frame.height - DESCENT_EM * frame.fontPx;
  const top = Math.max(least, Math.min(mid - line / 2, most - line));
  const ys = upper === 0 ? [top, top + line] : [top + line, top];
  return [
    { ...a, labelY: ys[0] ?? a.labelY },
    { ...b, labelY: ys[1] ?? b.labelY },
  ];
}

/** Where the labels of `items` go in `frame`, two never touching. */
function placesOf(
  items: readonly Labelled[],
  frame: LabelFrame,
): LabelPlace[] {
  const places = items.map((item) => placeOne(item, frame));
  const [a, b] = items;
  const [pa, pb] = places;
  if (!a || !b || !pa || !pb) return places;
  const space = SPACE_EM * frame.fontPx;
  if (!touch(boxOf(a, pa, frame), boxOf(b, pb, frame), space)) return places;
  const aLeft = a.x <= b.x;
  const sa = beside(a, aLeft ? 'end' : 'start', frame);
  const sb = beside(b, aLeft ? 'start' : 'end', frame);
  if (fits(boxOf(a, sa, frame), frame) && fits(boxOf(b, sb, frame), frame)) {
    return [sa, sb];
  }
  return stacked([pa, pb], frame);
}

/** `items` with their labels placed in `frame`. */
export function placeLabels<T extends Labelled>(
  items: readonly T[],
  frame: LabelFrame,
): (T & LabelPlace)[] {
  const places = placesOf(items, frame);
  return items.map((item, i) => ({ ...item, ...places[i] }) as T & LabelPlace);
}
