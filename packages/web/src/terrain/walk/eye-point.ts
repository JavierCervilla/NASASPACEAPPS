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
 * The latitude and longitude of the eye (VENT-121), for «Drop a pin here»:
 * east and north metres of the point's frame (ring-frame.ts) back to the
 * sphere, exact at any latitude, the pole included. Pure.
 */
import type { LatLon } from '../../lib/polar-projection';
import { frameAt, fromLocal } from '../ring/ring-frame';
import type { EastNorth } from './walk-reach';

const DEG = 180 / Math.PI;

/** The point `at` metres east and north of `site`. */
export function eyeLatLon(site: LatLon, at: EastNorth): LatLon {
  const frame = frameAt({ lat: site.lat, lonEast: site.lonEast }, 0);
  const [x, y, z] = fromLocal(frame, at[0], at[1], 0);
  const lon = Math.atan2(y, x) * DEG;
  return { lat: Math.asin(Math.max(-1, Math.min(1, z))) * DEG,
    lonEast: (lon + 360) % 360 };
}
