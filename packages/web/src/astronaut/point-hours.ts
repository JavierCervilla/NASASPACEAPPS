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
 * Where the custom point's hours come from: the API's ephemeris of any
 * point (`/api/v1/ephemeris?lat&lon&from&to&at`), which answers the
 * ephemeris alone, not wrapped in `{ site, ephemeris }` like a listed
 * site's. The point is already on the server's grid. Pure.
 */
import type { LatLon } from '../lib/polar-projection';
import type { HoursRange } from '../phone/site-hours';

/** The sites endpoint's sibling for any point. */
const SITES_PATH = /\/sites$/;

/** The URL of `point`'s hours for `range`, its first hour as `at`. */
export function pointHoursUrl(
  sitesUrl: string,
  point: LatLon,
  range: HoursRange,
): string {
  const query = new URLSearchParams({
    lat: point.lat.toFixed(2),
    lon: point.lonEast.toFixed(2),
    from: range.from,
    to: range.to,
    at: range.from,
  });
  return `${sitesUrl.replace(SITES_PATH, '/ephemeris')}?${query.toString()}`;
}

/** The body of the point route in the shape of a site's. */
export const asSiteBody = (body: unknown): unknown => ({ ephemeris: body });
