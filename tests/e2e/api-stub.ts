/**
 * Stubs the API for the phone runs: the real site list (packages/server/data/sites.json) and the ephemeris of
 * `/api/v1/sites/:id?from&to`. IM-2 answers from a real slice of the live API (fixtures/im2-athena-2026-11.json,
 * 1 November to 23 December 2026 18:00 UTC, recorded 2026-10-30); every other site answers one fixed sky. So the
 * widgets read the same in every run, and IM-2's read as the real Moon does.
 */
import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

export const SITES = JSON.parse(readFileSync(new URL('../../packages/server/data/sites.json', import.meta.url), 'utf8')) as {
  id: string;
  name: string;
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
}

/** Answers the site list and each site's range. */
export async function stubApi(page: Page, { status = 200, hold }: StubOptions = {}): Promise<void> {
  await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
  await page.route(/\/api\/v1\/sites\/[^/?]+\?/, async (route: Route) => {
    await hold;
    if (status !== 200) return route.fulfill({ status, json: { error: 'down' } });
    const url = new URL(route.request().url());
    const id = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
    return route.fulfill({ json: siteBody(url, id) });
  });
}
