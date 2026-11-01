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
 * The Earth as the Moon sees it, for drawing: the point on the Earth with the
 * Moon overhead (the sub-lunar point, the centre of the face turned to the
 * Moon) and the point with the Sun overhead (the sub-solar point, which places
 * the terminator). Geocentric, on a sphere: good to a few tenths of a degree,
 * plenty for a picture a few hundred pixels wide.
 */
import { gmstDeg, moonEquatorialKm } from './dsn-sky.ts';
import type { Vec3 } from './horizon.ts';
import { moonPosition } from './moon.ts';
import { sunTrueLongitude, wrapDeg } from './sun.ts';

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
/** Unix time of J2000.0 (2000-01-01 12:00 UT). */
const J2000_MS = 946_728_000_000;

/** A point on the Earth, geocentric degrees; longitude east in [-180, 180). */
export interface EarthPoint {
  readonly latDeg: number;
  readonly lonEastDeg: number;
}

/** The point under an equatorial direction at Unix time `ms`. */
function pointUnder([x, y, z]: Vec3, ms: number): EarthPoint {
  const ra = Math.atan2(y, x) / DEG;
  return {
    latDeg: Math.atan2(z, Math.hypot(x, y)) / DEG,
    lonEastDeg: wrapDeg(ra - gmstDeg(ms)),
  };
}

/** Where on the Earth the Moon is at the zenith at Unix time `ms`. */
export function subLunarPoint(ms: number): EarthPoint {
  return pointUnder(moonEquatorialKm(moonPosition(ms)), ms);
}

/**
 * Where on the Earth the Sun is at the zenith at Unix time `ms` (Meeus 25,
 * the Sun's latitude and aberration left out).
 */
export function earthSubSolarPoint(ms: number): EarthPoint {
  const t = (ms - J2000_MS) / DAY_MS / 36_525;
  const lon = sunTrueLongitude(t) * DEG;
  const eps = (23.439_291 - 0.013_004_2 * t) * DEG;
  const toward: Vec3 = [
    Math.cos(lon),
    Math.sin(lon) * Math.cos(eps),
    Math.sin(lon) * Math.sin(eps),
  ];
  return pointUnder(toward, ms);
}
