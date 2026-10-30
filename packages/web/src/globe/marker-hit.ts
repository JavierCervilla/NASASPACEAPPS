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
 * Which marker a click picks. Hit boxes are 44 px but two sites can sit
 * closer than that, and then the box stacked on top would take a click
 * aimed at the other dot: inside overlapping boxes the dot nearest the
 * pointer wins. A click from the keyboard has no pointer and picks the
 * focused marker.
 */
import { covers, type ScreenPoint } from './marker-cull';

/** A shown marker: its site and where its dot is, in px in the layer. */
export interface PlacedMarker {
  readonly id: string;
  readonly at: ScreenPoint;
}

const distance = (a: ScreenPoint, b: ScreenPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The marker whose hit box holds `pointer` and whose dot is nearest it;
 * null when no box holds it.
 */
export function nearestMarker(
  placed: readonly PlacedMarker[],
  pointer: ScreenPoint,
): PlacedMarker | null {
  const hits = placed.filter(({ at }) => covers(at, pointer));
  return hits.reduce<PlacedMarker | null>(
    (best, marker) =>
      best && distance(best.at, pointer) <= distance(marker.at, pointer)
        ? best
        : marker,
    null,
  );
}

/**
 * The site a click on the layer `root` picks, or undefined when it did
 * not land on a marker. `event.detail` is 0 for a keyboard click.
 */
export function pickedSite(
  event: MouseEvent,
  root: HTMLElement,
  placed: readonly PlacedMarker[],
): string | undefined {
  const target = (event.target as HTMLElement).dataset['siteId'];
  if (!target || event.detail === 0) return target;
  const box = root.getBoundingClientRect();
  const pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
  return nearestMarker(placed, pointer)?.id ?? target;
}
