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
 * Screen-space culling of the site markers: a zone ring whose centre falls
 * inside the hit box of a marker already placed is hidden, so every visible
 * button can be clicked. Exact markers always show; the selected marker is
 * placed first. Positions are never offset, and a hidden zone shows again
 * once zooming in pulls it apart. Pure, so it is tested without a page.
 */
import { markerKind, type MarkerKind, type MarkerSite } from './markers';

/**
 * The markers whose kind's layer shows (VENT-37), and the selected one
 * whatever its kind, so the selection never loses its marker.
 */
export function inLayers<T extends { site: MarkerSite }>(
  markers: readonly T[],
  kinds: ReadonlySet<MarkerKind>,
  selectedId: string | null,
): T[] {
  return markers.filter(
    ({ site }) => kinds.has(markerKind(site)) || site.id === selectedId,
  );
}

/** A point on screen, in px. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** A site marker as placed after a frame, for what must keep clear of it. */
export interface Mark {
  readonly at: ScreenPoint;
  readonly selected: boolean;
}

/** A facing marker about to be placed. */
export interface Candidate {
  readonly at: ScreenPoint;
  readonly zone: boolean;
  readonly selected: boolean;
}

/** Half the side of a marker's hit box (globe.css: 44px). */
export const HIT_HALF_PX = 22;

/** Placement order: the selected marker, then exact ones, then zones. */
function rank(candidate: Candidate): number {
  if (candidate.selected) return 0;
  return candidate.zone ? 2 : 1;
}

/** Whether `point` falls inside the hit box of a marker at `box`. */
export function covers(box: ScreenPoint, point: ScreenPoint): boolean {
  return (
    Math.abs(point.x - box.x) < HIT_HALF_PX &&
    Math.abs(point.y - box.y) < HIT_HALF_PX
  );
}

/** The candidates to show, in placement order. */
export function cullZones<T extends Candidate>(candidates: readonly T[]): T[] {
  const order = [...candidates].sort((a, b) => rank(a) - rank(b));
  const placed: T[] = [];
  for (const candidate of order) {
    const hidden =
      rank(candidate) === 2 &&
      placed.some(({ at }) => covers(at, candidate.at));
    if (!hidden) placed.push(candidate);
  }
  return placed;
}
