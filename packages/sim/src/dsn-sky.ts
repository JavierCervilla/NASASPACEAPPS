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
 * The Moon on the sky of each DSN antenna: its geocentric position
 * (`moon.ts`) turned equatorial with the mean obliquity, the Earth turned by
 * the Greenwich mean sidereal time (Meeus 12.4, UT1 taken as UTC: under
 * 0.005°), and the antenna on the WGS 84 ellipsoid, so the parallax (about 1°)
 * is exact. Nutation is left out on both sides, where it mostly cancels.
 */
import { DSN_COMPLEXES, type GeodeticSite } from './dsn-sites.ts';
import { horizontalOf, unitVector, type Horizontal, type Vec3 } from
  './horizon.ts';
import { moonPosition, type MoonPosition } from './moon.ts';
import type { DsnComplex } from './site.ts';

const DEG = Math.PI / 180;
const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257_223_563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const DAY_MS = 86_400_000;
/** Unix time of J2000.0 (2000-01-01 12:00 UT). */
const J2000_MS = 946_728_000_000;

/** Greenwich mean sidereal time at Unix time `ms`, degrees. */
function gmstDeg(ms: number): number {
  const days = (ms - J2000_MS) / DAY_MS;
  const t = days / 36_525;
  return 280.460_618_37 + 360.985_647_366_29 * days + 0.000_387_933 * t * t;
}

/** The Moon's geocentric equatorial vector of date, km. */
function moonEquatorialKm(moon: MoonPosition): Vec3 {
  const eps = (23.439_291 - 0.013_004_2 * moon.centuries) * DEG;
  const [x, y, z] = unitVector(moon.latDeg, moon.lonDeg);
  const d = moon.distanceKm;
  return [
    d * x,
    d * (y * Math.cos(eps) - z * Math.sin(eps)),
    d * (y * Math.sin(eps) + z * Math.cos(eps)),
  ];
}

/**
 * Elevation and azimuth of the Moon seen from an antenna at Unix time `ms`.
 * Pass `moon` when it is already computed for the same instant.
 */
export function moonElevationFromDsn(
  site: GeodeticSite,
  ms: number,
  moon: MoonPosition = moonPosition(ms),
): Horizontal {
  const lst = site.lonEast + gmstDeg(ms);
  const sinLat = Math.sin(site.lat * DEG);
  const n = WGS84_A_KM / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const [ux, uy] = unitVector(site.lat, lst);
  const station: Vec3 = [
    (n + site.altKm) * ux,
    (n + site.altKm) * uy,
    (n * (1 - WGS84_E2) + site.altKm) * sinLat,
  ];
  const [mx, my, mz] = moonEquatorialKm(moon);
  const toward: Vec3 = [mx - station[0], my - station[1], mz - station[2]];
  return horizontalOf(toward, site.lat, lst);
}

/** The Moon's elevation over every DSN complex, degrees. */
export function moonElevationsByDsn(
  sites: Readonly<Record<DsnComplex, GeodeticSite>>,
  ms: number,
  moon: MoonPosition,
): Record<DsnComplex, number> {
  const entries = DSN_COMPLEXES.map((complex) => [
    complex,
    moonElevationFromDsn(sites[complex], ms, moon).elDeg,
  ]);
  return Object.fromEntries(entries) as Record<DsnComplex, number>;
}
