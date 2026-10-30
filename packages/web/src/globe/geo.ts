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
 * Selenographic coordinates on the globe's sphere. The axes follow
 * Three.js's `SphereGeometry` and an equirectangular map centred on 0° east:
 * +Y is the north pole, +X is 0° E on the equator and -Z is 90° E. Pure
 * maths, no Three.js, so the tests run without a GPU.
 */

/** A point or direction in the globe's frame, in Moon radii. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const DEG = Math.PI / 180;

/** The point at `latDeg`, `lonEastDeg` on a sphere of `radius`. */
export function latLonToVector(
  latDeg: number,
  lonEastDeg: number,
  radius = 1,
): Vec3 {
  const lat = latDeg * DEG;
  const lon = lonEastDeg * DEG;
  return {
    x: radius * Math.cos(lat) * Math.cos(lon),
    y: radius * Math.sin(lat),
    z: -radius * Math.cos(lat) * Math.sin(lon),
  };
}

/** Latitude and east longitude, in degrees, of a direction (not zero). */
export function vectorToLatLon(v: Vec3): {
  latDeg: number;
  lonEastDeg: number;
} {
  const length = Math.hypot(v.x, v.y, v.z);
  return {
    latDeg: Math.asin(v.y / length) / DEG,
    lonEastDeg: Math.atan2(-v.z, v.x) / DEG,
  };
}

/**
 * True when a point on the unit sphere faces a camera at `eye`: it lies on
 * the hemisphere the camera sees, not behind the limb.
 */
export function isFacing(point: Vec3, eye: Vec3): boolean {
  return point.x * eye.x + point.y * eye.y + point.z * eye.z > 1;
}

/**
 * Unit vector from the Moon's centre toward the Sun standing over `sun`:
 * where the directional light comes from.
 */
export function sunDirection(sun: {
  readonly latDeg: number;
  readonly lonEastDeg: number;
}): Vec3 {
  return latLonToVector(sun.latDeg, sun.lonEastDeg);
}
