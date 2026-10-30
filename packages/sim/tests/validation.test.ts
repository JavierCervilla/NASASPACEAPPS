/**
 * Validation of the whole chain (Horizons request, parsing, frame) against known lunar periods, on the recorded
 * 89.5° S, 0° E data of November and December 2026. If these fail, suspect the longitude sign or the frame before
 * touching the tolerances.
 */
import { describe, expect, it } from 'vitest';
import { hoursBetween } from '../src/time.ts';
import { fixtureRows } from './fixtures.ts';
import { bestFitPeriod, upwardCrossings } from './period.ts';

// Reference periods, in days: the synodic month (Sun's cycle over a lunar site) and the draconic month (period of
// the libration in latitude, which drives the Earth's elevation seen from near the pole).
const SYNODIC_MONTH_D = 29.53;
const DRACONIC_MONTH_D = 27.21;
// 61 days of data hold only about two cycles, so the fit is good to a few tenths of a day; the slow seasonal drift
// and the other librations add a little more. One day is loose enough for that and still tells the two months
// (2.3 days apart) from each other.
const TOLERANCE_D = 1;
const SEARCH = { min: 20, max: 40, step: 0.1 };

function series(table: string): { days: number[]; elevations: number[] } {
  const rows = fixtureRows(table);
  const t0 = rows[0]?.t ?? '';
  return { days: rows.map((r) => hoursBetween(t0, r.t) / 24), elevations: rows.map((r) => r.elevation) };
}

describe('validation against lunar periods at 89.5 S', () => {
  it('the Sun cycles with the synodic month (about 29.5 days)', () => {
    const { days, elevations } = series('sun-from-moon-s89.5-e0');
    // In this southern summer the Sun never sets at 89.5° S (it stays between about 0.9 and 2.0 degrees), so there
    // is no rise and set to time: the period is read from the elevation's daily-cycle oscillation instead, which is
    // the same synodic cycle that makes it rise and set in the other half of the year.
    expect(Math.min(...elevations)).toBeGreaterThan(0);
    const period = bestFitPeriod(days, elevations, SEARCH);
    expect(Math.abs(period - SYNODIC_MONTH_D)).toBeLessThan(TOLERANCE_D);
  });

  it('the Earth elevation oscillates with the draconic month (about 27.2 days)', () => {
    const { days, elevations } = series('earth-from-moon-s89.5-e0');
    const period = bestFitPeriod(days, elevations, SEARCH);
    expect(Math.abs(period - DRACONIC_MONTH_D)).toBeLessThan(TOLERANCE_D);
    // Cross-check with the data itself: the Earth rises over 0 degrees once per cycle.
    const rises = upwardCrossings(days, elevations, 0);
    expect(rises).toHaveLength(2);
    expect(Math.abs((rises[1] ?? 0) - (rises[0] ?? 0) - DRACONIC_MONTH_D)).toBeLessThan(TOLERANCE_D);
  });

  it('the frame is right: from the 0° E meridian the Sun peaks due north and the Earth stays near north', () => {
    // Near the pole, "north" points along the site's own meridian towards the equator. On the 0° E meridian that is
    // towards the sub-Earth point, so the Earth's azimuth stays within the longitude libration (about 8 degrees),
    // and the Sun is highest when it crosses that meridian (azimuth near 0), at full Moon.
    const sun = fixtureRows('sun-from-moon-s89.5-e0');
    const earth = fixtureRows('earth-from-moon-s89.5-e0');
    const signedAz = (az: number): number => ((az + 180) % 360) - 180;
    for (const row of earth) expect(Math.abs(signedAz(row.azimuth))).toBeLessThan(10);
    const peak = sun.reduce((best, row) => (row.elevation > best.elevation ? row : best));
    expect(Math.abs(signedAz(peak.azimuth))).toBeLessThan(10);
  });
});

// IM-2 Athena's touchdown point as the API asks Horizons for it (on its 0.01 degree grid): 84.79° S, 29.20° E.
const IM2 = { lat: -84.79, lonEast: 29.2 };
// Horizons keeps the azimuth within the longitude libration (about ±8 degrees) of its mean; 10 leaves some room.
const LIBRATION_TOLERANCE_DEG = 10;
const MEAN_TOLERANCE_DEG = 2;

/** Initial great-circle bearing, in degrees clockwise from north in (-180, 180], from one point to another. */
function bearingDeg(from: { lat: number; lonEast: number }, to: { lat: number; lonEast: number }): number {
  const rad = Math.PI / 180;
  const dLon = (to.lonEast - from.lonEast) * rad;
  const y = Math.sin(dLon) * Math.cos(to.lat * rad);
  const x = Math.cos(from.lat * rad) * Math.sin(to.lat * rad) - Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos(dLon);
  return Math.atan2(y, x) / rad;
}

describe('validation of the longitude sign at IM-2 Athena (84.79 S, 29.20 E)', () => {
  it('the Earth hangs west of north, towards the sub-Earth point at 0° E', () => {
    // The geometric fact: the Earth always stays over the sub-Earth point, near 0° N 0° E (the Moon is tidally
    // locked; libration moves it by a few degrees). From a site at 29.2° E, 0° E lies 29° to the west, so the Earth
    // sits about 29 degrees west of local north (azimuth near 331). If east and west were flipped anywhere in the
    // chain, the site would be at 29.2° W and the Earth would hang 29 degrees EAST of north (azimuth near 29): 58
    // degrees off, far outside the libration. The 89.5 S point on the 0° meridian cannot catch this, since there
    // the sub-Earth point is due north whichever sign the longitude has.
    const expected = bearingDeg(IM2, { lat: 0, lonEast: 0 });
    expect(expected).toBeLessThan(-25);
    const signedAz = (az: number): number => ((az + 180) % 360) - 180;
    const azimuths = fixtureRows('earth-from-moon-im2-athena').map((row) => signedAz(row.azimuth));
    for (const az of azimuths) expect(Math.abs(az - expected)).toBeLessThan(LIBRATION_TOLERANCE_DEG);
    const mean = azimuths.reduce((sum, az) => sum + az, 0) / azimuths.length;
    expect(Math.abs(mean - expected)).toBeLessThan(MEAN_TOLERANCE_DEG);
  });
});
