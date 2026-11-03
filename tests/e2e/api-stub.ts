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
 * Stubs the API for the phone runs: the real site list (packages/server/data/sites.json), the ephemeris of
 * `/api/v1/sites/:id?from&to`, and that of any point, `/api/v1/ephemeris?lat&lon&from&to` (VENT-10); on request, a
 * point's terrain horizon, `/api/v1/horizon?lat&lon` (VENT-40). IM-2 answers
 * from a real slice of the live API (fixtures/im2-athena-2026-11.json,
 * 1 November to 23 December 2026 18:00 UTC, recorded 2026-10-30); every other site answers one fixed sky. So the
 * widgets read the same in every run, and IM-2's read as the real Moon does.
 */
import { readFileSync } from 'node:fs';
import type { BrowserContext, Page, Route } from '@playwright/test';

export const SITES = JSON.parse(readFileSync(new URL('../../packages/server/data/sites.json', import.meta.url), 'utf8')) as {
  id: string;
  name: string;
  group: string;
  lat: number;
  lonEast: number;
  approximate: boolean;
}[];

interface Sky {
  readonly sunEl: number;
  readonly earthEl: number;
  readonly dsn: 'goldstone' | 'canberra' | 'madrid' | null;
}

interface Hour extends Sky {
  readonly t: string;
}

const IM2_HOURS = (
  JSON.parse(readFileSync(new URL('./fixtures/im2-athena-2026-11.json', import.meta.url), 'utf8')) as {
    ephemeris: { hours: Hour[] };
  }
).ephemeris.hours;

// Apollo 11 has neither Sun nor Earth.
const SKIES: Record<string, Sky> = {
  apollo11: { sunEl: -12, earthEl: -4, dsn: null },
};
const DEFAULT_SKY: Sky = { sunEl: 3, earthEl: 1, dsn: 'goldstone' };
const HOUR_MS = 3_600_000;

/** An API `from` or `to`: a day (its first hour, or with `end` its last) or a UTC instant on the hour. */
function bound(raw: string | null, end: boolean): number {
  const value = raw ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T${end ? '23' : '00'}:00:00Z`) : Date.parse(value);
}

/** The hours of a constant sky from `from` to `to`, Unix ms. */
function constantHours(sky: Sky, from: number, to: number): unknown[] {
  const hours = [];
  for (let t = from; t <= to; t += HOUR_MS) {
    hours.push({ t: new Date(t).toISOString().replace('.000Z', 'Z'), sunAz: 0, earthAz: 0, ...sky });
  }
  return hours;
}

/** The `{ site, ephemeris }` body the API answers for a site and range, with only the hours the phone reads. */
function siteBody(url: URL, id: string): unknown {
  const from = bound(url.searchParams.get('from'), false);
  const to = bound(url.searchParams.get('to'), true);
  const hours =
    id === 'im2-athena'
      ? IM2_HOURS.filter(({ t }) => Date.parse(t) >= from && Date.parse(t) <= to)
      : constantHours(SKIES[id] ?? DEFAULT_SKY, from, to);
  return { site: SITES.find((s) => s.id === id), ephemeris: { hours } };
}

interface StubOptions {
  /** The site route's status; other than 200 it answers an error. */
  readonly status?: number;
  /** The site route answers only once this settles: a slow API. */
  readonly hold?: Promise<void>;
  /** The route for any point (a pinned custom point) answers only once this settles. */
  readonly pointHold?: Promise<void> | undefined;
  /** Answers `/api/v1/horizon` (VENT-40); without it the route is left alone, as before. */
  readonly horizon?: HorizonStub | undefined;
}

/** How the stub answers a point's terrain horizon. */
export interface HorizonStub {
  /** Other than 200 it answers an error (503: no terrain on the server). */
  readonly status?: number;
  /** The error's body text; by default «no terrain» (VENT-43: the server's own is «terrain data is not installed»). */
  readonly error?: string;
  /** It answers only once this settles. */
  readonly hold?: Promise<void>;
  /** The first request gets this error instead (VENT-45: a passing failure), the rest answer as above. */
  readonly failOnce?: { readonly status: number; readonly error: string; readonly retryAfterSec?: number };
}

/**
 * The terrain every point gets from the stub: 0.5° all around, and a wall 12° high from 300° to 330° of azimuth, which
 * hides an Earth in the north-west (at 85.50° S 40.00° E on 22 November 2026 20:00 UTC it stands 9.1° up at 314°) and
 * leaves the Sun (5.7° up at 339°).
 */
export const STUB_WALL = { fromDeg: 300, toDeg: 330, deg: 12, baseDeg: 0.5 } as const;

/** The stub's profile, 720 bins of 0.5° as little-endian int16 hundredths of a degree, in base64 (decodeProfile). */
function wallProfile(): string {
  const bytes = Buffer.alloc(720 * 2);
  for (let i = 0; i < 720; i++) {
    const az = i * 0.5;
    const inWall = az >= STUB_WALL.fromDeg && az <= STUB_WALL.toDeg;
    bytes.writeInt16LE(Math.round((inWall ? STUB_WALL.deg : STUB_WALL.baseDeg) * 100), i * 2);
  }
  return bytes.toString('base64');
}

/** The body of `/api/v1/horizon?lat&lon` (docs/terrain-api.md), read at 20 m nearest. */
function horizonBody(url: URL): unknown {
  const lat = Number(url.searchParams.get('lat'));
  const lonEast = Number(url.searchParams.get('lon'));
  const tiers = [
    { id: 'polar-south-20m', resolutionM: 20, share: 0.13 },
    { id: 'polar-south-80m', resolutionM: 80, share: 0.87 },
  ];
  return { lat, lonEast, heightM: 2, bins: 720, profile: wallProfile(), groundM: 1000, coverage: 1, tiers };
}

/** Routes `/api/v1/horizon` as `stub` says. */
async function stubHorizon(page: Page | BrowserContext, stub: HorizonStub): Promise<void> {
  let failOnce = stub.failOnce;
  await page.route(/\/api\/v1\/horizon\?/, async (route: Route) => {
    await stub.hold;
    if (failOnce) {
      const { status, error, retryAfterSec } = failOnce;
      failOnce = undefined;
      const headers: Record<string, string> = retryAfterSec === undefined ? {} : { 'Retry-After': String(retryAfterSec) };
      return route.fulfill({ status, json: { error }, headers });
    }
    const { status = 200, error = 'no terrain' } = stub;
    if (status !== 200) return route.fulfill({ status, json: { error } });
    return route.fulfill({ json: horizonBody(new URL(route.request().url())) });
  });
}

/** The sky every custom point gets from the stub: a landing window, so Horizons' answer is told from the sky's. */
export const POINT_SKY: Sky = { sunEl: 4, earthEl: 6, dsn: 'canberra' };

/** The ephemeris of `/api/v1/ephemeris?lat&lon&from&to`: answered alone, not wrapped in `{ site, ephemeris }`. */
function pointBody(url: URL): unknown {
  const from = bound(url.searchParams.get('from'), false);
  const to = bound(url.searchParams.get('to'), true);
  const lat = Number(url.searchParams.get('lat'));
  const lonEast = Number(url.searchParams.get('lon'));
  return { lat, lonEast, hours: constantHours(POINT_SKY, from, to) };
}

/**
 * Answers the site list and each site's range. On a context, the routes also answer the service worker's requests
 * (pwa.spec.ts); on a page they do not, so the other specs run with service workers blocked (playwright.config.ts).
 */
export async function stubApi(
  page: Page | BrowserContext,
  { status = 200, hold, pointHold, horizon }: StubOptions = {},
): Promise<void> {
  await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
  if (horizon) await stubHorizon(page, horizon);
  await page.route(/\/api\/v1\/ephemeris\?/, async (route: Route) => {
    await pointHold;
    if (status !== 200) return route.fulfill({ status, json: { error: 'down' } });
    return route.fulfill({ json: pointBody(new URL(route.request().url())) });
  });
  await page.route(/\/api\/v1\/sites\/[^/?]+\?/, async (route: Route) => {
    await hold;
    if (status !== 200) return route.fulfill({ status, json: { error: 'down' } });
    const url = new URL(route.request().url());
    const id = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
    return route.fulfill({ json: siteBody(url, id) });
  });
}
