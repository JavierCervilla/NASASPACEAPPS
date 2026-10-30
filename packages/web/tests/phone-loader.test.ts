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

import { HOUR_MS, type HourSample } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { loadWidgets } from '../src/phone/widgets-loader';

const SITES_URL = '/api/v1/sites';
const toIso = (ms: number): string => new Date(ms).toISOString().replace('.000Z', 'Z');

/** An API `from` or `to`: a day (read as its first, or with `end` its last hour) or an instant on the hour. */
function bound(raw: string | null, end: boolean): number {
  const value = raw ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(`${value}T${end ? '23' : '00'}:00:00Z`);
  return Date.parse(value);
}

/** A fake API that answers every hour of the requested range from `sky`, and records the URLs asked for. */
function fakeApi(sky: (t: string) => Pick<HourSample, 'sunEl' | 'earthEl'>) {
  const urls: URL[] = [];
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input), 'https://ventana.test');
    urls.push(url);
    const from = bound(url.searchParams.get('from'), false);
    const to = bound(url.searchParams.get('to'), true);
    const hours: HourSample[] = [];
    for (let ms = from; ms <= to; ms += HOUR_MS) {
      const t = toIso(ms);
      hours.push({ t, sunAz: 0, earthAz: 0, dsn: 'madrid', ...sky(t) });
    }
    return new Response(JSON.stringify({ ephemeris: { hours } }));
  });
  return { source: { fetch, sitesUrl: SITES_URL }, urls, fetch };
}

describe('loadWidgets, rolling horizon', () => {
  // Earth always up; the Sun up from 16 November to 5 December 2026.
  const SUN_UP = Date.parse('2026-11-16T00:00:00Z');
  const SUN_DOWN = Date.parse('2026-12-05T00:00:00Z');
  const sky = (t: string) => {
    const ms = Date.parse(t);
    return { sunEl: ms >= SUN_UP && ms < SUN_DOWN ? 8 : -8, earthEl: 10 };
  };

  it('counts down past the end of the month', async () => {
    const api = fakeApi(sky);
    const result = await loadWidgets(api.source, 'im2-athena', Date.parse('2026-11-29T00:20:00Z'));
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.widgets.sun).toMatchObject({ label: 'Sunset in', value: '6 d' });
  });

  it('keeps the window share to the calendar month', async () => {
    const api = fakeApi(sky);
    const result = await loadWidgets(api.source, 'im2-athena', Date.parse('2026-11-29T00:20:00Z'));
    if (result.kind !== 'ready') throw new Error(result.kind);
    // 15 of November's 30 days have the Sun and the Earth.
    expect(result.widgets.now.detail).toBe('50 % of November');
  });

  it('asks once, from the first hour of the month to 30 days after this hour', async () => {
    const api = fakeApi(sky);
    await loadWidgets(api.source, 'im2-athena', Date.parse('2026-10-30T10:42:00Z'));
    expect(api.fetch).toHaveBeenCalledOnce();
    const params = api.urls[0]?.searchParams;
    expect(params?.get('from')).toBe('2026-10-01T00:00:00Z');
    expect(params?.get('to')).toBe(toIso(Date.parse('2026-10-30T10:00:00Z') + 30 * 24 * HOUR_MS));
    expect(params?.get('at')).toBe('2026-10-30T10:00:00Z');
  });

  it('says how long at least when the Sun outlasts the data window', async () => {
    const api = fakeApi(() => ({ sunEl: 5, earthEl: 10 }));
    const result = await loadWidgets(api.source, 'im2-athena', Date.parse('2027-12-31T21:00:00Z'));
    if (result.kind !== 'ready') throw new Error(result.kind);
    expect(result.widgets.sun.value).toBe('at least 3 h');
    expect(result.widgets.dsn.detail).toBe('Madrid · at least 3 h left');
    expect(api.urls[0]?.searchParams.get('to')).toBe('2027-12-31T23:00:00Z');
  });
});

describe('loadWidgets, outside the data window', () => {
  it.each(['2025-12-31T23:59:00Z', '2028-01-01T00:00:00Z', '2030-05-01T12:00:00Z'])(
    'answers «outside» at %s without asking the API',
    async (now) => {
      const api = fakeApi(() => ({ sunEl: 5, earthEl: 10 }));
      expect(await loadWidgets(api.source, 'im2-athena', Date.parse(now))).toEqual({ kind: 'outside' });
      expect(api.fetch).not.toHaveBeenCalled();
    },
  );

  it('still answers in the first and the last hour of the window', async () => {
    for (const now of ['2026-01-01T00:00:00Z', '2027-12-31T23:59:00Z']) {
      const api = fakeApi(() => ({ sunEl: 5, earthEl: 10 }));
      expect((await loadWidgets(api.source, 'im2-athena', Date.parse(now))).kind).toBe('ready');
    }
  });
});

describe('loadWidgets, hardening', () => {
  const NOW = Date.parse('2026-11-23T18:00:00Z');

  it('does not ask for a site id outside the allowlist', async () => {
    for (const id of ['..', '../health', 'IM2', '-lead', 'a'.repeat(65), 'a/b', '']) {
      const api = fakeApi(() => ({ sunEl: 5, earthEl: 10 }));
      expect(await loadWidgets(api.source, id, NOW)).toEqual({ kind: 'error' });
      expect(api.fetch).not.toHaveBeenCalled();
    }
  });

  /** The body of a valid answer for 23 November 18:00, which the old loader would take. */
  const validHours = (t = '2026-11-23T18:00:00Z') => [{ t, sunEl: 5, sunAz: 0, earthEl: 10, earthAz: 0, dsn: null }];

  it('refuses a response over 2 MB by its content-length', async () => {
    const body = JSON.stringify({ ephemeris: { hours: validHours() } });
    const headers = { 'content-length': String(2 * 1024 * 1024 + 1) };
    const fetch = vi.fn(async () => new Response(body, { headers }));
    expect(await loadWidgets({ fetch, sitesUrl: SITES_URL }, 'im2-athena', NOW)).toEqual({ kind: 'error' });
    const small = vi.fn(async () => new Response(body, { headers: { 'content-length': String(body.length) } }));
    expect((await loadWidgets({ fetch: small, sitesUrl: SITES_URL }, 'im2-athena', NOW)).kind).toBe('ready');
  });

  it('refuses an hour whose timestamp is longer than 32 characters', async () => {
    // 33 characters that still parse as the same instant.
    const hours = validHours('2026-11-23T18:00:00.000000000000Z');
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ephemeris: { hours } })));
    expect(await loadWidgets({ fetch, sitesUrl: SITES_URL }, 'im2-athena', NOW)).toEqual({ kind: 'error' });
  });
});
