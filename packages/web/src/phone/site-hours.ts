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
 * Loads one site's hourly samples for a range from the API
 * (`/api/v1/sites/:id?from&to&at`). The widgets need only the hours: they
 * compute the rest with `@ventana/sim`.
 */
import type { DsnComplex, HourSample } from '@ventana/sim';
import { isSiteId, tooLarge } from '../lib/api-limits';
import type { WidgetRange } from './widget-range';

export interface HoursSource {
  readonly fetch: typeof fetch;
  /** The sites endpoint, same origin in production: `/api/v1/sites`. */
  readonly sitesUrl: string;
}

/** A range is at most 92 days of hours; anything longer is malformed. */
const MAX_HOURS = 92 * 24;
/** `2026-11-01T00:00:00Z` is 20; a longer time is not the API's. */
const MAX_TIME_CHARS = 32;
const COMPLEXES: readonly (DsnComplex | null)[] = [
  'goldstone', 'canberra', 'madrid', null,
];

function isHourSample(value: unknown): value is HourSample {
  const v = value as Partial<Record<keyof HourSample, unknown>> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.t === 'string' &&
    v.t.length <= MAX_TIME_CHARS &&
    [v.sunEl, v.sunAz, v.earthEl, v.earthAz].every(Number.isFinite) &&
    COMPLEXES.includes(v.dsn as DsnComplex | null)
  );
}

/** The hours of an API body (`{ site, ephemeris }`), or null if malformed. */
export function parseHours(body: unknown): HourSample[] | null {
  const ephemeris = (body as { ephemeris?: { hours?: unknown } } | null)
    ?.ephemeris;
  const hours = ephemeris?.hours;
  if (!Array.isArray(hours) || hours.length > MAX_HOURS) return null;
  const samples: unknown[] = hours;
  if (!samples.every(isHourSample)) return null;
  return samples.map(({ t, sunEl, sunAz, earthEl, earthAz, dsn }) => ({
    t, sunEl, sunAz, earthEl, earthAz, dsn,
  }));
}

/**
 * The URL of a site's hours for `range`.
 *
 * @throws Error when `id` is not a site id, before any URL is built.
 */
export function hoursUrl(sitesUrl: string, id: string, range: WidgetRange) {
  if (!isSiteId(id)) throw new Error('not a site id');
  const query = new URLSearchParams({
    from: range.from,
    to: range.to,
    at: range.at,
  });
  return `${sitesUrl}/${encodeURIComponent(id)}?${query.toString()}`;
}

/** The site's hours; throws with the reason when they cannot load. */
export async function loadSiteHours(
  source: HoursSource,
  id: string,
  range: WidgetRange,
): Promise<HourSample[]> {
  const response = await source.fetch(hoursUrl(source.sitesUrl, id, range), {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (tooLarge(response)) throw new Error('the body is too large');
  const hours = parseHours(await response.json().catch(() => null));
  if (!hours) throw new Error('the body was not the expected shape');
  return hours;
}
