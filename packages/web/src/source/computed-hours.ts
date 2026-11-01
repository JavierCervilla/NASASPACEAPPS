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
 * The simulator's hours for a site and range (`computedHours` of
 * `@ventana/sim`): the instant answer the views show before Horizons
 * arrives, and the other side of «Compare». A month takes tens of
 * milliseconds, so each point and range is computed once and kept, like
 * the API's (`phone/hours-cache.ts`). A site without coordinates has none.
 * The simulator has no data window: any month has hours.
 */
import {
  computedHours,
  type HourSample,
  type SelenographicPoint,
} from '@ventana/sim';
import { customPointOf } from '../pin/custom-point';
import type { HoursRange } from '../phone/site-hours';
import { widgetRange } from '../phone/widget-range';

/** A site's computed hours for a range; null when it has no point. */
export type ComputedLoader = (
  id: string,
  range: HoursRange,
) => readonly HourSample[] | null;

/** Where each site is, by id. */
export type PointOf = (id: string) => SelenographicPoint | null;

interface Located {
  readonly id: string;
  readonly lat: number;
  readonly lonEast: number;
}

/**
 * The point of each of `sites` that has coordinates, and of the custom
 * point, whose id carries it (VENT-10).
 */
export function pointsOf(sites: readonly Located[]): PointOf {
  const points = new Map<string, SelenographicPoint>();
  for (const { id, lat, lonEast } of sites) {
    if (Number.isFinite(lat) && Number.isFinite(lonEast)) {
      points.set(id, { latDeg: lat, lonEastDeg: lonEast });
    }
  }
  return (id) => {
    const custom = customPointOf(id);
    if (custom) return { latDeg: custom.lat, lonEastDeg: custom.lonEast };
    return points.get(id) ?? null;
  };
}

/** As many entries as the API's cache keeps. */
const MAX_ENTRIES = 24;

/**
 * A loader that computes each point and range once. The key is the point,
 * not the id: the sky depends on where, and a site that moves (VENT-10's
 * free pin) is computed again.
 */
export function cachedComputed(
  pointOf: PointOf,
  maxEntries = MAX_ENTRIES,
): ComputedLoader {
  const kept = new Map<string, readonly HourSample[]>();
  return (id, range) => {
    const point = pointOf(id);
    if (!point) return null;
    const where = `${point.latDeg},${point.lonEastDeg}`;
    const key = `${where}|${range.from}|${range.to}`;
    const hit = kept.get(key);
    if (hit) return hit;
    const hours = computedHours(point, range.from, range.to);
    kept.set(key, hours);
    const oldest = kept.keys().next().value;
    if (kept.size > maxEntries && oldest !== undefined) kept.delete(oldest);
    return hours;
  };
}

/**
 * The computed hours of site `id` over the month of `atMs` and the 30
 * days after it, as the API is asked for, in any year.
 */
export function computedMonth(
  load: ComputedLoader,
  id: string,
  atMs: number,
): readonly HourSample[] | null {
  const range = widgetRange(atMs, true);
  return range ? load(id, range) : null;
}
