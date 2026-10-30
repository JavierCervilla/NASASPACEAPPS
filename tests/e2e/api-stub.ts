/**
 * Stubs the API for the phone runs: the real site list (packages/server/data/sites.json) and a small ephemeris stub
 * for `/api/v1/sites/:id?from&to`, with one fixed sky per site, so the widgets read the same in every run.
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

// IM-2 has a landing window (the canvas values, 23 Nov 2026 18:00 UTC); Apollo 11 has neither Sun nor Earth.
const SKIES: Record<string, Sky> = {
  'im2-athena': { sunEl: 6.4, earthEl: 10.6, dsn: 'madrid' },
  apollo11: { sunEl: -12, earthEl: -4, dsn: null },
};
const DEFAULT_SKY: Sky = { sunEl: 3, earthEl: 1, dsn: 'goldstone' };
const HOUR_MS = 3_600_000;

/** The `{ site, ephemeris }` body the API answers for a site and range, with only the hours the phone reads. */
function siteBody(url: URL, id: string): unknown {
  const sky = SKIES[id] ?? DEFAULT_SKY;
  const from = Date.parse(`${url.searchParams.get('from')}T00:00:00Z`);
  const to = Date.parse(`${url.searchParams.get('to')}T23:00:00Z`);
  const hours = [];
  for (let t = from; t <= to; t += HOUR_MS) {
    hours.push({ t: new Date(t).toISOString().replace('.000Z', 'Z'), sunAz: 0, earthAz: 0, ...sky });
  }
  return { site: SITES.find((s) => s.id === id), ephemeris: { hours } };
}

interface StubOptions {
  /** The site route's status; other than 200 it answers an error. */
  readonly status?: number;
  /** The site route answers only once this settles: a slow API. */
  readonly hold?: Promise<void>;
}

/** Answers the site list and each site's month. */
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
