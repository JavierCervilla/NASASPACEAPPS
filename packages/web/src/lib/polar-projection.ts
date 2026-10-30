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
 * The polar map's projection: south polar stereographic, the pole at the
 * centre and 80° S on the rim, 0° E at the top and 90° E on the right
 * (validated canvas «Polar map»). The map image is drawn with the same
 * formula (scripts/moon_textures.py `polar`). Pure.
 */

/** The map's rim: the northernmost latitude it shows, in degrees. */
export const RIM_LAT_DEG = -80;

const DEG = Math.PI / 180;
/** tan of half the rim's colatitude: the radius scale of the rim. */
const RIM_SCALE = Math.tan(((90 + RIM_LAT_DEG) * DEG) / 2);

/**
 * A point on the map's unit disk: the centre is 0, 0, the rim is at
 * radius 1, `x` grows to the right and `y` down, as on screen.
 */
export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

/** A selenographic point, degrees, longitude positive to the east. */
export interface LatLon {
  readonly lat: number;
  readonly lonEast: number;
}

/** Where `point` falls on the map; outside the rim for north of 80° S. */
export function toPolarMap({ lat, lonEast }: LatLon): MapPoint {
  const colat = (90 + lat) * DEG;
  const r = Math.tan(colat / 2) / RIM_SCALE;
  return { x: r * Math.sin(lonEast * DEG), y: -r * Math.cos(lonEast * DEG) };
}

/** The point under `at` on the map, longitude in -180..180. */
export function fromPolarMap(at: MapPoint): LatLon {
  const colat = 2 * Math.atan(Math.hypot(at.x, at.y) * RIM_SCALE);
  const lonEast = Math.atan2(at.x, -at.y) / DEG;
  return { lat: colat / DEG - 90, lonEast };
}

/** Whether a latitude lies on the map: from 80° S to the pole. */
export function onPolarMap(lat: number): boolean {
  return Number.isFinite(lat) && lat <= RIM_LAT_DEG;
}
