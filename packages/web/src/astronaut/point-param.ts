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
 * The custom point a link opens: `?lat=…&lon=…` (degrees, longitude east),
 * as the page writes it when the astronaut is dropped, so a point is
 * shareable and survives a reload. It lives beside `?site=`, which it
 * leaves alone. Anything that is not two finite numbers is ignored; a
 * latitude past a pole is clamped, a longitude wrapped. Pure.
 */
import type { LatLon } from '../lib/polar-projection';
import { snapPoint } from './custom-point';

export const LAT_PARAM = 'lat';
export const LON_PARAM = 'lon';
/** Longer than any coordinate a person or the page writes. */
const MAX_CHARS = 24;

/** A parameter as a number, or NaN when absent, empty or too long. */
function numberOf(params: URLSearchParams, name: string): number {
  const raw = params.get(name)?.trim() ?? '';
  if (raw === '' || raw.length > MAX_CHARS) return Number.NaN;
  return Number(raw);
}

/** The point `search` names, snapped to the grid; null when it names none. */
export function pointFromSearch(search: string): LatLon | null {
  const params = new URLSearchParams(search);
  const lat = numberOf(params, LAT_PARAM);
  const lonEast = numberOf(params, LON_PARAM);
  return snapPoint({ lat, lonEast });
}

/**
 * `search` naming `point` (or no point, for null), every other parameter
 * kept; with a leading `?`, or empty when nothing is left.
 */
export function searchWithPoint(
  search: string,
  point: LatLon | null,
): string {
  const params = new URLSearchParams(search);
  params.delete(LAT_PARAM);
  params.delete(LON_PARAM);
  if (point) {
    params.set(LAT_PARAM, point.lat.toFixed(2));
    params.set(LON_PARAM, point.lonEast.toFixed(2));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}
