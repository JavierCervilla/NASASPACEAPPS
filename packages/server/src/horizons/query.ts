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
 * What to ask JPL Horizons: one observer table for one target seen from one
 * point, over one calendar month.
 */
import type { DsnComplex } from '@ventana/sim';

/** Horizons body codes used by the service. */
export const BODY = { sun: '10', earth: '399', moon: '301' } as const;

/**
 * A point on a body's surface: geodetic latitude and east longitude in degrees,
 * altitude in km.
 */
export interface SurfacePoint {
  readonly lat: number;
  readonly lonEast: number;
  readonly altKm: number;
}

/**
 * One observer-table request: `target` seen from `point` on `centerBody`,
 * hourly from `start` to `stop`.
 */
export interface HorizonsQuery {
  readonly target: string;
  readonly centerBody: string;
  readonly point: SurfacePoint;
  /** First hour, `YYYY-MM-DD HH:MM` in UTC. */
  readonly start: string;
  /** Last hour (inclusive), `YYYY-MM-DD HH:MM` in UTC. */
  readonly stop: string;
}

/**
 * The 70 m antenna of each Deep Space Network complex (DSS 14, DSS 43, DSS 63),
 * WGS 84 geodetic coordinates from DSN Telecommunications Link Design Handbook
 * 810-005, module 301 rev. N «Coverage and Geometry», Table 5
 * (https://deepspace.jpl.nasa.gov/dsndocs/810-005/301/301N.pdf), converted from
 * degrees-minutes-seconds: DSS 14 35°25'33.24" N 243°06'37.66" E, DSS 43
 * 35°24'08.73" S 148°58'52.56" E, DSS 63 40°25'52.36" N 355°45'07.17" E.
 */
export const DSN_SITES: Readonly<Record<DsnComplex, SurfacePoint>> = {
  goldstone: { lat: 35.425901, lonEast: -116.889538, altKm: 1.001 },
  canberra: { lat: -35.402424, lonEast: 148.981267, altKm: 0.689 },
  madrid: { lat: 40.431210, lonEast: -4.248009, altKm: 0.865 },
};

/** Order in which the DSN complexes are queried and reported. */
export const DSN_COMPLEXES: readonly DsnComplex[] = ['goldstone', 'canberra', 'madrid'];

function formatAngle(value: number): string {
  return String(Number(value.toFixed(6)));
}

/**
 * Normalises an east longitude to [0, 360) so that equivalent points share one
 * cache entry.
 */
export function normaliseLonEast(lonEast: number): number {
  const lon = ((lonEast % 360) + 360) % 360;
  return Object.is(lon, -0) ? 0 : lon;
}

/**
 * The Horizons API query string parameters of a request, values already quoted
 * as Horizons expects.
 */
export function toHorizonsParams(query: HorizonsQuery): Record<string, string> {
  const { point } = query;
  return {
    format: 'json',
    COMMAND: `'${query.target}'`,
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: `'coord@${query.centerBody}'`,
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${formatAngle(normaliseLonEast(point.lonEast))},${formatAngle(point.lat)},${formatAngle(point.altKm)}'`,
    START_TIME: `'${query.start}'`,
    STOP_TIME: `'${query.stop}'`,
    STEP_SIZE: "'1 h'",
    QUANTITIES: "'4'",
    CSV_FORMAT: "'YES'",
  };
}

/**
 * A whole calendar month in UTC: its first and last hour as Horizons times, and
 * its first instant in ms.
 */
export interface MonthSpan {
  readonly startMs: number;
  readonly start: string;
  readonly stop: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * The calendar months that cover `[fromMs, toMs]`. The service always asks
 * Horizons for whole months and slices the rows locally, so overlapping ranges
 * and every site's DSN tables share cache entries.
 */
export function monthsCovering(fromMs: number, toMs: number): MonthSpan[] {
  const months: MonthSpan[] = [];
  const first = new Date(fromMs);
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth();
  for (;;) {
    const startMs = Date.UTC(year, month, 1);
    if (startMs > toMs) return months;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const prefix = `${year}-${pad(month + 1)}`;
    months.push({ startMs, start: `${prefix}-01 00:00`, stop: `${prefix}-${pad(lastDay)} 23:00` });
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
}
