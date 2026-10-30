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
 * The Horizons requests behind one ephemeris: for every calendar month the
 * range covers, the Sun and the Earth seen from the point and the Moon seen
 * from each DSN complex.
 */
import type { DsnComplex } from '@ventana/sim';
import {
  BODY,
  DSN_COMPLEXES,
  DSN_SITES,
  monthsCovering,
  type HorizonsQuery,
  type MonthSpan,
} from './horizons/query.ts';

/**
 * A point and an hourly range, already validated. Times are ms since the epoch,
 * on whole hours.
 */
export interface EphemerisRequest {
  readonly lat: number;
  readonly lonEast: number;
  readonly fromMs: number;
  /** Last hour of the range, inclusive. */
  readonly toMs: number;
  /** Reference hour for the "what comes next" metrics. */
  readonly atMs: number;
}

/**
 * The tables of one request: the point's Sun and Earth, and each DSN complex.
 */
export type Table = 'sun' | 'earth' | DsnComplex;

function queriesFor(
  request: EphemerisRequest,
  month: MonthSpan,
): [Table, HorizonsQuery][] {
  const site = { lat: request.lat, lonEast: request.lonEast, altKm: 0 };
  const span = { start: month.start, stop: month.stop };
  const fromMoon = { centerBody: BODY.moon, point: site, ...span };
  return [
    ['sun', { target: BODY.sun, ...fromMoon }],
    ['earth', { target: BODY.earth, ...fromMoon }],
    ...DSN_COMPLEXES.map((complex): [Table, HorizonsQuery] => [
      complex,
      {
        target: BODY.moon,
        centerBody: BODY.earth,
        point: DSN_SITES[complex],
        ...span,
      },
    ]),
  ];
}

/** Every table request for the months the range covers. */
export function jobsFor(request: EphemerisRequest): [Table, HorizonsQuery][] {
  return monthsCovering(request.fromMs, request.toMs).flatMap((month) =>
    queriesFor(request, month),
  );
}

/**
 * Every Horizons request `computeEphemeris` sends for a request (the
 * cache warm-up sends the same ones).
 */
export function ephemerisQueries(request: EphemerisRequest): HorizonsQuery[] {
  return jobsFor(request).map(([, query]) => query);
}
