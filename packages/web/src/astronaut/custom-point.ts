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
 * The custom point: where the astronaut stands (VENT-10). It is the
 * selected site like any listed one, under an id that carries its point
 * (`@-85.87,61.34`), so every cache keyed by site (the API's hours, the
 * computed hours) tells two points apart. The point is snapped to the
 * server's grid (0.01°, packages/server/src/params.ts), so what the page
 * shows, computes and asks Horizons for is the same point. Pure.
 */
import type { LatLon } from '../lib/polar-projection';

/** The server's grid step, in degrees (COORDINATE_STEP_DEG). */
export const GRID_STEPS_PER_DEG = 100;

const PREFIX = '@';
const NUMBER = String.raw`-?\d{1,3}(?:\.\d{1,2})?`;
const CUSTOM_ID = new RegExp(`^${PREFIX}(${NUMBER}),(${NUMBER})$`);

/** `deg` on the grid, without -0. */
function onGrid(deg: number): number {
  const snapped = Math.round(deg * GRID_STEPS_PER_DEG) / GRID_STEPS_PER_DEG;
  return snapped === 0 ? 0 : snapped;
}

/**
 * `point` with its latitude clamped to the poles, its longitude wrapped to
 * -180..180 (180 E reads 180) and both on the grid; null when either is
 * not a finite number.
 */
export function snapPoint(point: LatLon): LatLon | null {
  const { lat, lonEast } = point;
  if (!Number.isFinite(lat) || !Number.isFinite(lonEast)) return null;
  const wrapped = ((((lonEast + 180) % 360) + 360) % 360) - 180;
  const lon = onGrid(wrapped);
  const clamped = onGrid(Math.min(90, Math.max(-90, lat)));
  return { lat: clamped, lonEast: lon === -180 ? 180 : lon };
}

/** The site id of the custom point at `point`, snapped. */
export function customId(point: LatLon): string {
  const snapped = snapPoint(point) ?? { lat: 0, lonEast: 0 };
  return `${PREFIX}${snapped.lat.toFixed(2)},${snapped.lonEast.toFixed(2)}`;
}

/** The point of a custom point's id; null for any other id. */
export function customPointOf(id: string): LatLon | null {
  const match = CUSTOM_ID.exec(id);
  if (!match?.[1] || !match[2]) return null;
  return snapPoint({ lat: Number(match[1]), lonEast: Number(match[2]) });
}
