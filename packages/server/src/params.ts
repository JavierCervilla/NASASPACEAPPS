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

/** Validation of the query parameters of the ephemeris routes. */
import { HOUR_MS } from '@ventana/sim';
import type { EphemerisRequest } from './ephemeris.ts';
import { ParamError, hourParam, numberParam } from './param-values.ts';

export { ParamError } from './param-values.ts';

/** Longest range one request may ask for, in days (a little over a quarter). */
export const MAX_SPAN_DAYS = 92;

/**
 * Grid step, in degrees, the point of a request is rounded to before Horizons
 * is asked, so nearby points share their Horizons calls and cache files. It
 * does not bound the cache on its own (the grid still has millions of points):
 * the disk is bounded by the byte cap of the client's `points/` cache, and the
 * Horizons calls by its download queue and the per-IP miss limit in `app.ts`.
 * 0.01 degrees is about 300 m on the Moon (radius 1737.4 km: 1737.4 × π / 180 ×
 * 0.01 ≈ 0.30 km), well below what changes the Sun and Earth elevations the
 * service computes (no local relief) and below the precision of most published
 * landing coordinates.
 */
export const COORDINATE_STEP_DEG = 0.01;

/**
 * First and last day (UTC, inclusive) the service answers for: a request
 * outside this window gets 400 instead of new Horizons calls. It covers the
 * hackathon (November 2026) with margin on both sides.
 */
export const SUPPORTED_FIRST_DAY = '2026-01-01';
export const SUPPORTED_LAST_DAY = '2027-12-31';
const SUPPORTED_FROM_MS = Date.parse(`${SUPPORTED_FIRST_DAY}T00:00:00Z`);
const SUPPORTED_TO_MS = Date.parse(`${SUPPORTED_LAST_DAY}T23:00:00Z`);

/**
 * Rounds an angle to the {@link COORDINATE_STEP_DEG} grid (and turns -0 into 0,
 * so it prints as `0`).
 */
export function roundToGrid(degrees: number): number {
  const stepsPerDegree = Math.round(1 / COORDINATE_STEP_DEG);
  const rounded = Math.round(degrees / COORDINATE_STEP_DEG) / stepsPerDegree;
  return rounded === 0 ? 0 : rounded;
}

/** The parameters every ephemeris request carries. */
export interface RawEphemerisParams {
  readonly lat?: string | undefined;
  readonly lon?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly at?: string | undefined;
}

interface HourRange {
  readonly fromMs: number;
  readonly toMs: number;
}

/** The validated `from` and `to` of a request. */
function parseRange(raw: RawEphemerisParams): HourRange {
  const fromMs = hourParam('from', raw.from, false);
  const toMs = hourParam('to', raw.to, true);
  if (toMs < fromMs) throw new ParamError('"to" must not be before "from"');
  if (fromMs < SUPPORTED_FROM_MS || toMs > SUPPORTED_TO_MS) {
    throw new ParamError(
      `the range must fall between ${SUPPORTED_FIRST_DAY} and ${SUPPORTED_LAST_DAY}`,
    );
  }
  if (toMs - fromMs > MAX_SPAN_DAYS * 24 * HOUR_MS) {
    throw new ParamError(
      `the range must not be longer than ${MAX_SPAN_DAYS} days`,
    );
  }
  return { fromMs, toMs };
}

/**
 * The reference hour: `at` when given, else the current hour when it falls in
 * the range, else the start of the range.
 */
function referenceHour(
  at: string | undefined,
  range: HourRange,
  nowMs: number,
): number {
  const inRange = (ms: number): boolean =>
    ms >= range.fromMs && ms <= range.toMs;
  if (at === undefined) {
    const nowHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
    return inRange(nowHour) ? nowHour : range.fromMs;
  }
  const atMs = hourParam('at', at, false);
  if (!inRange(atMs)) {
    throw new ParamError('"at" must fall between "from" and "to"');
  }
  return atMs;
}

/**
 * Validates the parameters of an ephemeris request. `lon` is the east
 * longitude. The point is rounded to the {@link COORDINATE_STEP_DEG} grid and
 * the range must fall inside the supported window. `at`, when given, must fall
 * inside the range; without it, the reference hour is the current hour when it
 * falls in the range, else the start of the range.
 *
 * @throws ParamError naming the first invalid parameter.
 */
export function parseEphemerisParams(
  raw: RawEphemerisParams,
  nowMs: number,
): EphemerisRequest {
  const lat = roundToGrid(numberParam('lat', raw.lat, -90, 90));
  const lonEast = roundToGrid(numberParam('lon', raw.lon, -180, 360));
  const range = parseRange(raw);
  const atMs = referenceHour(raw.at, range, nowMs);
  return { lat, lonEast, ...range, atMs };
}
