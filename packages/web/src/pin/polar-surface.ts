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
 * The polar map as a place to drop the pin on (VENT-10): its disk's
 * box gives the map's unit disk, and the polar projection
 * (lib/polar-projection.ts) turns it into the Moon's point and back.
 * Outside the rim (north of 80° S) there is no map.
 */
import {
  fromPolarMap,
  toPolarMap,
  type LatLon,
} from '../lib/polar-projection';
import type { ClientPoint, DropSurface } from './surfaces';

/** The disk's centre and radius, client px. */
function diskOf(host: HTMLElement) {
  const box = host.getBoundingClientRect();
  const r = box.width / 2;
  return { cx: box.left + r, cy: box.top + box.height / 2, r };
}

/** The surface of the polar map drawn in `host`, its disk. */
export function polarSurface(host: HTMLElement): DropSurface {
  return {
    host,
    pointAt: (x, y): LatLon | null => {
      const { cx, cy, r } = diskOf(host);
      if (r === 0) return null;
      const at = { x: (x - cx) / r, y: (y - cy) / r };
      return Math.hypot(at.x, at.y) > 1 ? null : fromPolarMap(at);
    },
    place: (point): ClientPoint | null => {
      const at = toPolarMap(point);
      if (Math.hypot(at.x, at.y) > 1) return null;
      const { cx, cy, r } = diskOf(host);
      return { x: cx + at.x * r, y: cy + at.y * r };
    },
  };
}
