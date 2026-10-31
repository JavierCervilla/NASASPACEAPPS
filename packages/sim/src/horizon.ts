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
 * Elevation and azimuth of a direction seen from a point on a body, in the
 * body's own frame. Shared by the lunar sky (Sun and Earth from a lunar site)
 * and the DSN sky (the Moon from an antenna, in the Earth's equatorial frame
 * rotated by sidereal time).
 */

/** A Cartesian vector. */
export type Vec3 = readonly [number, number, number];

/** Where a body stands on the local sky, in degrees. */
export interface Horizontal {
  /** Elevation above the local horizon. */
  readonly elDeg: number;
  /** Azimuth clockwise from north, in [0, 360). */
  readonly azDeg: number;
}

const DEG = Math.PI / 180;

/** The unit vector of a latitude and a longitude, in degrees. */
export function unitVector(latDeg: number, lonDeg: number): Vec3 {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), c * Math.sin(lon), Math.sin(lat)];
}

/**
 * Elevation and azimuth of `toward` (any length) seen from a point whose
 * local vertical points to `latDeg`, `lonDeg` in the same frame.
 */
export function horizontalOf(
  toward: Vec3,
  latDeg: number,
  lonDeg: number,
): Horizontal {
  const [x, y, z] = toward;
  const sLat = Math.sin(latDeg * DEG);
  const cLat = Math.cos(latDeg * DEG);
  const sLon = Math.sin(lonDeg * DEG);
  const cLon = Math.cos(lonDeg * DEG);
  const up = cLat * (cLon * x + sLon * y) + sLat * z;
  const east = -sLon * x + cLon * y;
  const north = -sLat * (cLon * x + sLon * y) + cLat * z;
  const az = Math.atan2(east, north) / DEG;
  return {
    elDeg: Math.atan2(up, Math.hypot(east, north)) / DEG,
    azDeg: (az + 360) % 360,
  };
}
