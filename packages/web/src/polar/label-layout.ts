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
 * Which marker labels the polar map shows, and on which side of their
 * dots. Sites crowd near Mons Mouton and the pole, so a label that would
 * overlap one already placed, or a dot other than its own, tries the dot's
 * left, and is left out if that is taken too: the selected site's first
 * (it always shows, on its right), then exact sites, then zones. A zone
 * whose dot sits on an exact site's (within a click's reach) never takes a
 * label there, so the label beside a landed site's dot is that site's.
 * Markers left without a label get a number (polar/badge-layout.ts).
 * Label widths are estimated from their length, so this is pure and
 * tested without a page.
 */
import { covers } from '../globe/marker-cull';
import type { MapPoint } from '../lib/polar-projection';
import { dotBox, overlaps, toPx, type Box } from './layout-geometry';

/** A marker to label, at `at` on the unit disk. */
export interface Labelled {
  readonly id: string;
  readonly at: MapPoint;
  readonly label: string;
  readonly zone: boolean;
}

/** The side of its dot a label sits on. */
export type Side = 'right' | 'left';

/** Label metrics at 12 px (polar.css): px per character, height. */
const CHAR_PX = 6.6;
const LABEL_HEIGHT_PX = 16;
/** The gap from a dot's centre to its label; the selected dot is larger. */
const LABEL_GAP_PX = 10;
const SELECTED_GAP_PX = 18;

/** The box of `marker`'s label on `side` of its dot, in px. */
export function labelBox(
  marker: Labelled,
  size: number,
  selected: boolean,
  side: Side = 'right',
): Box {
  const { x, y } = toPx(marker.at, size);
  const gap = selected ? SELECTED_GAP_PX : LABEL_GAP_PX;
  const width = marker.label.length * CHAR_PX;
  const left = side === 'right' ? x + gap : x - gap - width;
  const half = LABEL_HEIGHT_PX / 2;
  return { left, right: left + width, top: y - half, bottom: y + half };
}

/** Whether zone `marker`'s dot is within a click of an exact site's. */
function onExactSite(
  marker: Labelled,
  markers: readonly Labelled[],
  size: number,
): boolean {
  if (!marker.zone) return false;
  const dot = toPx(marker.at, size);
  return markers.some((m) => !m.zone && covers(toPx(m.at, size), dot));
}

/** The first side of `marker` whose label box is clear of `taken`. */
function freeSide(marker: Labelled, size: number, taken: Box[]): Side | null {
  const sides: readonly Side[] = ['right', 'left'];
  const clear = sides.find((side) => {
    const box = labelBox(marker, size, false, side);
    return !taken.some((b) => overlaps(b, box));
  });
  return clear ?? null;
}

/** The labels that show on a map `size` px wide, by id, with their side. */
export function visibleLabels(
  markers: readonly Labelled[],
  size: number,
  selectedId: string | null,
): Map<string, Side> {
  const rank = (m: Labelled): number =>
    m.id === selectedId ? 0 : Number(m.zone) + 1;
  const hidden = markers.filter((m) => onExactSite(m, markers, size));
  const dots = markers
    .filter((m) => !hidden.includes(m))
    .map((m) => ({ id: m.id, box: dotBox(toPx(m.at, size)) }));
  const placed: Box[] = [];
  const shown = new Map<string, Side>();
  for (const marker of [...markers].sort((a, b) => rank(a) - rank(b))) {
    const chosen = marker.id === selectedId;
    const others = dots.filter((d) => d.id !== marker.id).map((d) => d.box);
    const side = chosen ? 'right' : freeSide(marker, size, [...placed, ...others]);
    if (side === null || (!chosen && hidden.includes(marker))) continue;
    placed.push(labelBox(marker, size, chosen, side));
    shown.set(marker.id, side);
  }
  return shown;
}
