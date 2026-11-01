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

/** The DSN timeline (VENT-7): handoffs to the minute, the outlook at an instant, the day's runs and the Earth seen from the Moon. */
import { describe, expect, it } from 'vitest';
import { DSN_COMPLEXES } from '../src/dsn-sites.ts';
import { dsnOutlook, nextTurn, runsWhere } from '../src/dsn-outlook.ts';
import { dsnSpans, dsnStateAt } from '../src/dsn-timeline.ts';
import { earthSubSolarPoint, subLunarPoint } from '../src/earth-view.ts';
import { minuteRuns, MINUTE_MS } from '../src/minute-runs.ts';
import type { DsnComplex } from '../src/site.ts';
import { skyAt } from '../src/sky.ts';
import { HOUR_MS, toMs } from '../src/time.ts';
import { activeDsn, earthLink } from '../src/visibility.ts';
import { fixtureRows } from './fixtures.ts';

const DAY_MS = 24 * HOUR_MS;
/** The canvas «Dsn*» instant: IM-2 Athena, Sun 22 November 2026, 20:00 UTC. */
const CANVAS = toMs('2026-11-22T20:00:00Z');
const IM2 = { latDeg: -84.7906, lonEastDeg: 29.1957 };
/** The no-link canvas: a dropped pin at 85.50° S, 31.00° E, 14 November 2026 18:00 UTC. */
const NO_LINK = { latDeg: -85.5, lonEastDeg: 31 };
const NO_LINK_AT = toMs('2026-11-14T18:00:00Z');

const at = (iso: string): number => toMs(iso);

describe('minuteRuns', () => {
  it('puts each change on the first whole minute of the new state, from coarse samples', () => {
    const keyAt = (ms: number): string => (ms >= at('2026-11-01T00:37:00Z') && ms < at('2026-11-01T00:41:00Z') ? 'b' : 'a');
    const runs = minuteRuns({ keyAt, fromMs: at('2026-11-01T00:00:00Z'), toMs: at('2026-11-01T01:00:00Z'), stepMs: 3 * MINUTE_MS });
    expect(runs.map((r) => [new Date(r.startMs).toISOString().slice(11, 16), r.key])).toEqual([
      ['00:00', 'a'],
      ['00:37', 'b'],
      ['00:41', 'a'],
    ]);
    expect(runs.at(-1)?.endMs).toBe(at('2026-11-01T01:00:00Z'));
  });

  it('sees a change in the last minute of the stretch', () => {
    const keyAt = (ms: number): number => (ms >= at('2026-11-01T00:59:00Z') ? 1 : 0);
    const runs = minuteRuns({ keyAt, fromMs: at('2026-11-01T00:00:00Z'), toMs: at('2026-11-01T01:00:00Z'), stepMs: 10 * MINUTE_MS });
    expect(runs.map((r) => r.key)).toEqual([0, 1]);
  });
});

describe('the DSN at the canvas instant (IM-2, 22 Nov 2026 20:00 UTC)', () => {
  const spans = dsnSpans(CANVAS - 20 * HOUR_MS, CANVAS + 2 * DAY_MS);

  it('Robledo listens with the Moon at 52.3°, until Goldstone takes over at 02:16 UTC', () => {
    const outlook = dsnOutlook(spans, CANVAS);
    expect(outlook.active).toBe('madrid');
    expect(outlook.untilMs).toBe(at('2026-11-23T02:16:00Z'));
    expect(outlook.next).toEqual({ complex: 'goldstone', startMs: at('2026-11-23T02:16:00Z') });
  });

  it('then Canberra at 10:58, a silence from 16:41, and Robledo again at 16:48', () => {
    expect(nextTurn(spans, CANVAS, 'canberra')?.startMs).toBe(at('2026-11-23T10:58:00Z'));
    const gap = dsnOutlook(spans, at('2026-11-23T16:44:00Z'));
    expect(gap).toEqual({ active: null, untilMs: at('2026-11-23T16:48:00Z'), next: { complex: 'madrid', startMs: at('2026-11-23T16:48:00Z') } });
    const canberra = dsnOutlook(spans, at('2026-11-23T16:00:00Z'));
    expect(canberra.untilMs).toBe(at('2026-11-23T16:41:00Z'));
    expect(canberra.next?.complex).toBe('madrid');
  });

  it('each complex sees the Moon above 10° in its own runs, to the minute', () => {
    const above = (complex: DsnComplex) =>
      runsWhere(spans, (s) => s.above.includes(complex)).map((r) => [r.startMs, r.endMs]);
    expect(above('goldstone')).toContainEqual([at('2026-11-22T23:58:00Z'), at('2026-11-23T12:32:00Z')]);
    expect(above('canberra')).toContainEqual([at('2026-11-23T08:38:00Z'), at('2026-11-23T16:41:00Z')]);
    expect(above('madrid').map(([, end]) => end)).toContain(at('2026-11-23T04:47:00Z'));
    expect(above('madrid').map(([start]) => start)).toContain(at('2026-11-23T16:48:00Z'));
  });

  it('the state at an instant agrees with the timeline', () => {
    expect(dsnStateAt(CANVAS)).toEqual({ active: 'madrid', above: ['madrid'] });
  });

  it('draws the Earth with the Moon over 17.95° N 30.1° E and the Sun over 20.3° S 123.5° W', () => {
    const moon = subLunarPoint(CANVAS);
    expect(moon.latDeg).toBeCloseTo(17.95, 0);
    expect(moon.lonEastDeg).toBeCloseTo(30.1, 0);
    const sun = earthSubSolarPoint(CANVAS);
    expect(Math.abs(sun.latDeg - -20.26)).toBeLessThan(0.3);
    expect(Math.abs(sun.lonEastDeg - -123.45)).toBeLessThan(0.3);
  });

  it('the Earth is high enough at IM-2: a link', () => {
    expect(earthLink(skyAt(IM2, CANVAS).earthEl)).toBe('link');
  });
});

describe('no link', () => {
  it('85.50° S 31.00° E on 14 Nov 2026 18:00 UTC: the Earth is below the horizon, while Robledo would listen', () => {
    expect(earthLink(skyAt(NO_LINK, NO_LINK_AT).earthEl)).toBe('below');
    expect(dsnStateAt(NO_LINK_AT).active).toBe('madrid');
  });

  it('tells an Earth under 3° from one under the horizon', () => {
    expect(earthLink(3.01)).toBe('link');
    expect(earthLink(3)).toBe('low');
    expect(earthLink(0.4)).toBe('low');
    expect(earthLink(0)).toBe('below');
    expect(earthLink(-2)).toBe('below');
  });
});

describe('the computed handoffs against JPL Horizons, hourly over November and December 2026', () => {
  it('name the same complex every hour, except within an hour of a handoff', () => {
    const rows = DSN_COMPLEXES.map((complex) => [complex, fixtureRows(`moon-from-${complex}`)] as const);
    const first = toMs(rows[0]![1][0]!.t);
    const spans = dsnSpans(first - HOUR_MS, first + 62 * DAY_MS);
    const handoffs = spans.slice(1).filter((s, i) => s.active !== spans[i]!.active).map((s) => s.startMs);
    const offenders = rows[0]![1].map((row, i) => {
      const ms = toMs(row.t);
      const horizons = activeDsn(Object.fromEntries(rows.map(([complex, r]) => [complex, r[i]!.elevation])));
      const computed = dsnOutlook(spans, ms).active;
      const nearHandoff = handoffs.some((h) => Math.abs(h - ms) <= HOUR_MS);
      return horizons === computed || nearHandoff ? null : row.t;
    }).filter(Boolean);
    expect(rows[0]![1].length).toBe(61 * 24);
    expect(offenders).toEqual([]);
  });
});
