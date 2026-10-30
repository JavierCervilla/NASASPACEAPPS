/**
 * The sub-solar point model against JPL Horizons quantity 15 (the Sun's sub-longitude and sub-latitude on the Moon),
 * recorded daily over November and December 2026 by packages/server/scripts/record-subsolar-fixture.ts.
 */
import { describe, expect, it } from 'vitest';
import { parseHorizonsTable } from '../src/horizons-csv.ts';
import { subSolarPoint, wrapDeg } from '../src/sun.ts';
import { toMs } from '../src/time.ts';
import { fixtureResult } from './fixtures.ts';

// The model's error over this fixture is 0.17° in longitude and 0.04° in latitude (see src/sun.ts); the bound leaves
// room for that and still catches a sign or frame error, which would be tens of degrees.
const BOUND_DEG = 0.5;

/**
 * The fixture's rows. Quantity 15 prints the same columns the parser reads for quantity 4 (date, two blank flags,
 * two values), so `azimuth` holds the sub-solar east longitude and `elevation` its latitude.
 */
function horizonsSubSolar(): { ms: number; lonEastDeg: number; latDeg: number }[] {
  return parseHorizonsTable(fixtureResult('moon-subsolar-from-geocentre-2026-11-12.json')).map((row) => ({
    ms: toMs(row.t),
    lonEastDeg: row.azimuth,
    latDeg: row.elevation,
  }));
}

describe('subSolarPoint against Horizons', () => {
  const rows = horizonsSubSolar();

  it('covers the 61 days of November and December 2026', () => {
    expect(rows).toHaveLength(61);
  });

  it(`keeps the longitude within ${BOUND_DEG}° of Horizons`, () => {
    const worst = Math.max(...rows.map((row) => Math.abs(wrapDeg(subSolarPoint(row.ms).lonEastDeg - row.lonEastDeg))));
    expect(worst).toBeLessThan(BOUND_DEG);
  });

  it(`keeps the latitude within ${BOUND_DEG}° of Horizons`, () => {
    const worst = Math.max(...rows.map((row) => Math.abs(subSolarPoint(row.ms).latDeg - row.latDeg)));
    expect(worst).toBeLessThan(BOUND_DEG);
  });
});

describe('wrapDeg', () => {
  it('wraps into [-180, 180)', () => {
    expect(wrapDeg(285.13)).toBeCloseTo(-74.87, 6);
    expect(wrapDeg(180)).toBe(-180);
    expect(wrapDeg(-540)).toBe(-180);
    expect(wrapDeg(0)).toBe(0);
  });
});
