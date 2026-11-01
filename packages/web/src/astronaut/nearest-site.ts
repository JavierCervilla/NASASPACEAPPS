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
 * The listed site nearest a custom point, for its subtitle: «Near Nobile
 * Rim 1 · 26 km». Great-circle distance on the Moon's mean sphere. Pure.
 */
import type { LatLon } from '../lib/polar-projection';

/** The Moon's mean radius, km (IAU). */
export const MOON_RADIUS_KM = 1737.4;
const DEG = Math.PI / 180;

/** The great-circle distance between `a` and `b`, km (haversine). */
export function greatCircleKm(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lonEast - a.lonEast) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * MOON_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sites closer together than this share a point, km. */
const SAME_POINT_KM = 0.5;

/**
 * The nearest of `sites` with coordinates, and how far; null for none.
 * Of the sites within {@link SAME_POINT_KM} of the nearest (sharing its
 * point), the one with the shortest name: always measured against the
 * nearest, so a run of close sites never leads further away.
 */
export function nearestSite<T extends LatLon & { readonly name: string }>(
  point: LatLon,
  sites: readonly T[],
): { site: T; km: number } | null {
  const measured = sites
    .filter(({ lat, lonEast }) => Number.isFinite(lat + lonEast))
    .map((site) => ({ site, km: greatCircleKm(point, site) }));
  const nearestKm = Math.min(...measured.map(({ km }) => km));
  let best: { site: T; km: number } | null = null;
  for (const entry of measured) {
    if (entry.km - nearestKm >= SAME_POINT_KM) continue;
    if (!best || entry.site.name.length < best.site.name.length) best = entry;
  }
  return best;
}
