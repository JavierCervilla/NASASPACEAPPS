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

/**
 * Where one point lies from another, metres east and north in the second's
 * tangent plane (VENT-34). The API centres a tile on the 0.01° grid, up to
 * about 160 m from the site the view opened on; this places that centre
 * from the site, so the site stays at the scene's origin. Taken on the
 * Moon's sphere through unit vectors, so the seam of longitude and the
 * poles need no case of their own. The tile's grid keeps its own north,
 * which turns from the site's by under 0.005° (a fifth of a metre at the
 * tile's edge). Pure.
 */
import type { LatLon } from '../lib/polar-projection';
import { MOON_RADIUS_KM } from '../pin/nearest-site';

const RAD = Math.PI / 180;
const MOON_RADIUS_M = MOON_RADIUS_KM * 1000;

export interface Offset {
  readonly east: number;
  readonly north: number;
}

/** The unit vector of a point on the sphere (x, y towards 0° E, z north). */
function unit({ lat, lonEast }: LatLon): readonly [number, number, number] {
  const flat = Math.cos(lat * RAD);
  return [flat * Math.cos(lonEast * RAD), flat * Math.sin(lonEast * RAD),
    Math.sin(lat * RAD)];
}

/** `point` seen from `site`: metres east and north of it. */
export function offsetFrom(site: LatLon, point: LatLon): Offset {
  const [lat, lon] = [site.lat * RAD, site.lonEast * RAD];
  const [x, y, z] = unit(point);
  const east = -Math.sin(lon) * x + Math.cos(lon) * y;
  const north = -Math.sin(lat) * Math.cos(lon) * x
    - Math.sin(lat) * Math.sin(lon) * y + Math.cos(lat) * z;
  return { east: east * MOON_RADIUS_M, north: north * MOON_RADIUS_M };
}
