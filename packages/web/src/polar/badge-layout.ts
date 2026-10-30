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
 * The number badges of the polar map: every marker the label layout left
 * without a label (polar/label-layout.ts) gets a small number beside its
 * dot, and the map's key lists the numbers with their names, so each
 * marker can be told at a glance, without hovering. Numbers run in
 * reading order, top to bottom, then left to right. Each badge takes the
 * first corner of its dot, near and then a step further out, that is
 * clear of labels, other dots and badges already placed. Pure.
 */
import { type Labelled, type Side, labelBox } from './label-layout';
import { dotBox, overlaps, toPx, type Box } from './layout-geometry';

/** The corner of its dot a badge sits at. */
export type Corner = 'ne' | 'nw' | 'se' | 'sw';
/** How far from its dot: next to it, or past a neighbour's ring. */
export type Reach = 'near' | 'far';

/** A marker's number badge. */
export interface Badge {
  readonly id: string;
  /** From 1, in reading order. */
  readonly n: number;
  readonly corner: Corner;
  readonly reach: Reach;
  readonly label: string;
}

type Place = Pick<Badge, 'corner' | 'reach'>;

/** The badge's side and its gap from the dot's centre (polar.css). */
const BADGE_PX = 16;
const GAP_PX: Readonly<Record<Reach, number>> = { near: 5, far: 13 };
/** The places a badge tries, in order. */
const PLACES: readonly Place[] = (['near', 'far'] as const).flatMap((reach) =>
  (['ne', 'nw', 'se', 'sw'] as const).map((corner) => ({ corner, reach })),
);
/** Half the side a selected dot and its ring keep clear (polar.css). */
const SELECTED_HALF_PX = 11;

/** The box of a badge at `place` around `marker`'s dot. */
function badgeBox(marker: Labelled, size: number, place: Place): Box {
  const { x, y } = toPx(marker.at, size);
  const gap = GAP_PX[place.reach];
  const left = place.corner.endsWith('e') ? x + gap : x - gap - BADGE_PX;
  const top = place.corner.startsWith('s') ? y + gap : y - gap - BADGE_PX;
  return { left, top, right: left + BADGE_PX, bottom: top + BADGE_PX };
}

/** The first place around `marker` clear of `taken`; else the first. */
function freePlace(marker: Labelled, size: number, taken: Box[]): Place {
  const clear = PLACES.find((place) => {
    const box = badgeBox(marker, size, place);
    return !taken.some((b) => overlaps(b, box));
  });
  return clear ?? { corner: 'ne', reach: 'near' };
}

/**
 * The badges of the markers whose labels do not show (`shown`, with each
 * label's side), on a map `size` px wide with `selectedId` selected.
 */
export function numberBadges(
  markers: readonly Labelled[],
  size: number,
  shown: ReadonlyMap<string, Side>,
  selectedId: string | null,
): Badge[] {
  const taken: Box[] = markers.flatMap((m) => {
    const side = shown.get(m.id);
    return side ? [labelBox(m, size, m.id === selectedId, side)] : [];
  });
  const unlabelled = markers
    .filter(({ id }) => !shown.has(id))
    .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  const dots = markers.map(({ id, at }) => {
    const half = id === selectedId ? SELECTED_HALF_PX : undefined;
    return { id, box: dotBox(toPx(at, size), half) };
  });
  return unlabelled.map((marker, index) => {
    const others = dots.filter(({ id }) => id !== marker.id).map((d) => d.box);
    const place = freePlace(marker, size, [...taken, ...others]);
    taken.push(badgeBox(marker, size, place));
    const { id, label } = marker;
    return { id, n: index + 1, ...place, label };
  });
}
