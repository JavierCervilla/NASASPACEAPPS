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
 * shareable and survives a reload. It lives beside `?site=`. Only plain
 * decimals count (an optional sign, digits, an optional fraction: no hex,
 * exponent or bare dot), the latitude within ±90° and the longitude from
 * -180° to 360° east, the range the API's ephemeris route takes; anything
 * else is ignored, never clamped. Pure.
 */
import type { LatLon } from '../lib/polar-projection';
import { SITE_PARAM } from '../lib/site-param';
import { snapPoint } from './custom-point';

export const LAT_PARAM = 'lat';
export const LON_PARAM = 'lon';
/** Longer than any coordinate a person or the page writes. */
const MAX_CHARS = 24;
const DECIMAL = /^[+-]?\d+(?:\.\d+)?$/;
const LAT_RANGE = [-90, 90] as const;
/** East longitudes past 180° are wrapped, as the server reads them. */
const LON_RANGE = [-180, 360] as const;

/** A parameter as a number in `range`, or NaN when it is not one. */
function numberOf(
  params: URLSearchParams,
  name: string,
  [min, max]: readonly [number, number],
): number {
  const raw = params.get(name) ?? '';
  if (raw.length > MAX_CHARS || !DECIMAL.test(raw)) return Number.NaN;
  const value = Number(raw);
  return value >= min && value <= max ? value : Number.NaN;
}

/** The point `search` names, snapped to the grid; null when it names none. */
export function pointFromSearch(search: string): LatLon | null {
  const params = new URLSearchParams(search);
  const lat = numberOf(params, LAT_PARAM, LAT_RANGE);
  const lonEast = numberOf(params, LON_PARAM, LON_RANGE);
  return snapPoint({ lat, lonEast });
}

/** `params` as a search, with a leading `?`, or empty when there are none. */
function searchOf(params: URLSearchParams): string {
  const text = params.toString();
  return text ? `?${text}` : '';
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
  return searchOf(params);
}

/**
 * `search` once the listed site `id` is selected: no point, and `?site=`
 * naming `id` if the address named a site (the page never adds one).
 */
export function searchWithListed(search: string, id: string): string {
  const params = new URLSearchParams(searchWithPoint(search, null));
  if (params.has(SITE_PARAM)) params.set(SITE_PARAM, id);
  return searchOf(params);
}
