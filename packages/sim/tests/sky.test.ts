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
 * The analytic sky (src/sky.ts) against the recorded JPL Horizons tables, every hour of November and December 2026:
 * the Sun and the Earth from two lunar points, and the Moon from the three DSN 70 m antennas.
 */
import { describe, expect, it } from 'vitest';
import type { HorizonsRow } from '../src/horizons-csv.ts';
import { DSN_COMPLEXES, DSN_SITES } from '../src/dsn-sites.ts';
import { moonElevationFromDsn } from '../src/dsn-sky.ts';
import { computedHours, skyAt } from '../src/sky.ts';
import type { HourSample } from '../src/site.ts';
import { wrapDeg } from '../src/sun.ts';
import { HOUR_MS, toMs } from '../src/time.ts';
import { activeDsn, hasEarth, hasSun, isWindow } from '../src/visibility.ts';
import { fixtureRows } from './fixtures.ts';

// Declared accuracy against Horizons, about twice the worst error measured on these fixtures (Sun 0.04° in elevation
// and 0.17° in azimuth, from the sub-solar model; Earth 0.03° and 0.02°; Moon from the DSN 0.007° and 0.04°), so a
// regression shows long before it reaches the 0.3° the booleans can afford.
const SUN_EL_TOLERANCE_DEG = 0.1;
const EARTH_EL_TOLERANCE_DEG = 0.1;
const DSN_EL_TOLERANCE_DEG = 0.05;
const AZ_TOLERANCE_DEG = 0.3;
// Azimuth is ill-conditioned near the zenith; it is only compared below this elevation.
const AZ_MAX_ELEVATION_DEG = 80;
// Hours this close to a transition in the Horizons series may flip either way.
const TRANSITION_MARGIN_H = 1;
// One month of hours must take well under 50 ms; the budget is generous so a busy CI machine does not flake.
const MONTH_BUDGET_MS = 50;

// The two lunar points of the fixtures (IM-2 on the API's 0.01 degree grid, as recorded).
const POINTS = {
  's89.5-e0': { latDeg: -89.5, lonEastDeg: 0 },
  'im2-athena': { latDeg: -84.79, lonEastDeg: 29.2 },
} as const;

interface Errors {
  readonly el: number;
  readonly az: number;
}

function maxErrors(rows: readonly HorizonsRow[], model: (ms: number) => { el: number; az: number }): Errors {
  let el = 0;
  let az = 0;
  for (const row of rows) {
    const got = model(toMs(row.t));
    el = Math.max(el, Math.abs(got.el - row.elevation));
    if (row.elevation < AZ_MAX_ELEVATION_DEG) az = Math.max(az, Math.abs(wrapDeg(got.az - row.azimuth)));
  }
  return { el, az };
}

/** Indexes of the hours whose flag differs from a neighbour within the margin, in the reference series. */
function nearTransition(flags: readonly unknown[]): Set<number> {
  const near = new Set<number>();
  for (let i = 1; i < flags.length; i += 1) {
    if (flags[i] === flags[i - 1]) continue;
    for (let k = i - 1 - TRANSITION_MARGIN_H; k <= i + TRANSITION_MARGIN_H; k += 1) near.add(k);
  }
  return near;
}

function disagreements<T>(reference: readonly T[], computed: readonly T[]): number {
  const near = nearTransition(reference);
  return reference.filter((flag, i) => !near.has(i) && flag !== computed[i]).length;
}

function horizonsSamples(point: keyof typeof POINTS): HourSample[] {
  const sun = fixtureRows(`sun-from-moon-${point}`);
  const earth = fixtureRows(`earth-from-moon-${point}`);
  const dsn = DSN_COMPLEXES.map((complex) => [complex, fixtureRows(`moon-from-${complex}`)] as const);
  return sun.map((row, i) => ({
    t: row.t,
    sunEl: row.elevation,
    sunAz: row.azimuth,
    earthEl: earth[i]!.elevation,
    earthAz: earth[i]!.azimuth,
    dsn: activeDsn(Object.fromEntries(dsn.map(([complex, rows]) => [complex, rows[i]!.elevation]))),
  }));
}

describe.each(Object.keys(POINTS) as (keyof typeof POINTS)[])('the sky at %s against Horizons', (name) => {
  const point = POINTS[name];
  const sun = maxErrors(fixtureRows(`sun-from-moon-${name}`), (ms) => {
    const sky = skyAt(point, ms);
    return { el: sky.sunEl, az: sky.sunAz };
  });
  const earth = maxErrors(fixtureRows(`earth-from-moon-${name}`), (ms) => {
    const sky = skyAt(point, ms);
    return { el: sky.earthEl, az: sky.earthAz };
  });

  it(`keeps the Sun within ${SUN_EL_TOLERANCE_DEG}° in elevation and ${AZ_TOLERANCE_DEG}° in azimuth`, () => {
    console.info(`Sun at ${name}: max |Δel| ${sun.el.toFixed(3)}°, max |Δaz| ${sun.az.toFixed(3)}°`);
    expect(sun.el).toBeLessThan(SUN_EL_TOLERANCE_DEG);
    expect(sun.az).toBeLessThan(AZ_TOLERANCE_DEG);
  });

  it(`keeps the Earth within ${EARTH_EL_TOLERANCE_DEG}° in elevation and ${AZ_TOLERANCE_DEG}° in azimuth`, () => {
    console.info(`Earth at ${name}: max |Δel| ${earth.el.toFixed(3)}°, max |Δaz| ${earth.az.toFixed(3)}°`);
    expect(earth.el).toBeLessThan(EARTH_EL_TOLERANCE_DEG);
    expect(earth.az).toBeLessThan(AZ_TOLERANCE_DEG);
  });

  it('agrees with Horizons on Sun, Earth, window and DSN antenna away from transitions', () => {
    const reference = horizonsSamples(name);
    const computed = computedHours(point, reference[0]!.t, reference.at(-1)!.t);
    expect(computed.map((h) => h.t)).toEqual(reference.map((h) => h.t));
    for (const flag of [hasSun, hasEarth, isWindow]) {
      expect(disagreements(reference.map(flag), computed.map(flag))).toBe(0);
    }
    expect(disagreements(reference.map((h) => h.dsn), computed.map((h) => h.dsn))).toBe(0);
  });
});

describe.each(DSN_COMPLEXES)('the Moon from %s against Horizons', (complex) => {
  it(`stays within ${DSN_EL_TOLERANCE_DEG}° in elevation and ${AZ_TOLERANCE_DEG}° in azimuth`, () => {
    const errors = maxErrors(fixtureRows(`moon-from-${complex}`), (ms) => {
      const sky = moonElevationFromDsn(DSN_SITES[complex], ms);
      return { el: sky.elDeg, az: sky.azDeg };
    });
    console.info(`Moon from ${complex}: max |Δel| ${errors.el.toFixed(3)}°, max |Δaz| ${errors.az.toFixed(3)}°`);
    expect(errors.el).toBeLessThan(DSN_EL_TOLERANCE_DEG);
    expect(errors.az).toBeLessThan(AZ_TOLERANCE_DEG);
  });
});

describe('computedHours', () => {
  it('gives one sample per hour, both ends included, like the server', () => {
    const hours = computedHours(POINTS['im2-athena'], '2026-11-14T00:00:00Z', '2026-11-14T05:00:00Z');
    expect(hours.map((h) => h.t)).toEqual([0, 1, 2, 3, 4, 5].map((h) => `2026-11-14T0${h}:00:00Z`));
  });

  it('starts at the first whole hour at or after `from`', () => {
    const hours = computedHours(POINTS['im2-athena'], '2026-11-14T00:30:00Z', '2026-11-14T02:00:00Z');
    expect(hours.map((h) => h.t)).toEqual(['2026-11-14T01:00:00Z', '2026-11-14T02:00:00Z']);
  });

  it('is empty when `to` is before `from`', () => {
    expect(computedHours(POINTS['im2-athena'], '2026-11-14T05:00:00Z', '2026-11-14T00:00:00Z')).toEqual([]);
  });

  it(`computes a 744-hour month in under ${MONTH_BUDGET_MS} ms`, () => {
    computedHours(POINTS['s89.5-e0'], '2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z');
    const start = performance.now();
    const hours = computedHours(POINTS['s89.5-e0'], '2026-12-01T00:00:00Z', '2026-12-31T23:00:00Z');
    const elapsed = performance.now() - start;
    console.info(`computedHours, ${hours.length} h: ${elapsed.toFixed(1)} ms`);
    expect(hours).toHaveLength(31 * 24);
    expect(elapsed).toBeLessThan(MONTH_BUDGET_MS);
  });

  it('is pure: the same input gives the same output', () => {
    const ms = toMs('2026-11-20T12:00:00Z');
    expect(skyAt(POINTS['s89.5-e0'], ms)).toEqual(skyAt(POINTS['s89.5-e0'], ms));
    expect(skyAt(POINTS['s89.5-e0'], ms + HOUR_MS)).not.toEqual(skyAt(POINTS['s89.5-e0'], ms));
  });
});
