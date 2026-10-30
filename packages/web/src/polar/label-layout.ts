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
 * Which marker labels the polar map shows. Sites crowd near Mons Mouton
 * and the pole, so a label that would overlap one already placed, or a
 * dot other than its own, is left out: the selected site's first (it
 * always shows), then exact sites, then zones. Every marker stays a named
 * button, so a hidden label hides no site. Label widths are estimated
 * from their length, so this is pure and tested without a page.
 */
import type { MapPoint } from '../lib/polar-projection';

/** A marker to label, at `at` on the unit disk. */
export interface Labelled {
  readonly id: string;
  readonly at: MapPoint;
  readonly label: string;
  readonly zone: boolean;
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Label metrics at 12 px (polar.css): px per character, height, gap. */
const CHAR_PX = 6.6;
const LABEL_HEIGHT_PX = 16;
const LABEL_GAP_PX = 10;
/** Half the side of the room a dot keeps clear of labels. */
const DOT_HALF_PX = 7;

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** The px point of `at` on a map `size` px wide. */
export function toPx(at: MapPoint, size: number): MapPoint {
  return { x: ((1 + at.x) / 2) * size, y: ((1 + at.y) / 2) * size };
}

/** The box a dot at `dot` (px) keeps clear of labels. */
function dotBox(dot: MapPoint): Box {
  return {
    left: dot.x - DOT_HALF_PX,
    right: dot.x + DOT_HALF_PX,
    top: dot.y - DOT_HALF_PX,
    bottom: dot.y + DOT_HALF_PX,
  };
}

/** The box of `marker`'s label, to the right of its dot, in px. */
function labelBox(marker: Labelled, size: number): Box {
  const { x, y } = toPx(marker.at, size);
  const left = x + LABEL_GAP_PX;
  const half = LABEL_HEIGHT_PX / 2;
  const right = left + marker.label.length * CHAR_PX;
  return { left, right, top: y - half, bottom: y + half };
}

/** The ids whose labels show on a map `size` px wide. */
export function visibleLabels(
  markers: readonly Labelled[],
  size: number,
  selectedId: string | null,
): Set<string> {
  const rank = (m: Labelled): number =>
    m.id === selectedId ? 0 : Number(m.zone) + 1;
  const dots = markers.map((m) => ({ id: m.id, ...toPx(m.at, size) }));
  const placed: Box[] = [];
  const shown = new Set<string>();
  for (const marker of [...markers].sort((a, b) => rank(a) - rank(b))) {
    const box = labelBox(marker, size);
    const others = dots.filter((d) => d.id !== marker.id).map(dotBox);
    const taken = marker.id === selectedId ? [] : [...placed, ...others];
    if (taken.some((b) => overlaps(b, box))) continue;
    placed.push(box);
    shown.add(marker.id);
  }
  return shown;
}
