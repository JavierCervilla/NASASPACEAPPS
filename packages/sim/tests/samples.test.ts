import { describe, expect, it } from 'vitest';
import { buildHourSamples } from '../src/samples.ts';
import { DSN_MIN_ELEVATION_DEG } from '../src/visibility.ts';
import { fixtureRows, southPoleSamples } from './fixtures.ts';

const row = (t: string, elevation: number) => ({ t, azimuth: 10, elevation });

describe('buildHourSamples', () => {
  it('joins the tables hour by hour and picks the DSN complex', () => {
    const t = '2026-11-01T00:00:00Z';
    expect(
      buildHourSamples({
        sun: [row(t, 1)],
        earth: [row(t, 5)],
        moonFromDsn: { goldstone: [row(t, 12)], canberra: [row(t, -3)], madrid: [row(t, 40)] },
      }),
    ).toEqual([{ t, sunEl: 1, sunAz: 10, earthEl: 5, earthAz: 10, dsn: 'madrid' }]);
  });

  it('refuses tables on different grids', () => {
    const sun = [row('2026-11-01T00:00:00Z', 1)];
    const other = [row('2026-11-01T01:00:00Z', 1)];
    expect(() => buildHourSamples({ sun, earth: other, moonFromDsn: { goldstone: sun, canberra: sun, madrid: sun } })).toThrow(
      /Earth/,
    );
    expect(() => buildHourSamples({ sun, earth: [], moonFromDsn: { goldstone: sun, canberra: sun, madrid: sun } })).toThrow(
      /rows/,
    );
  });

  it('on the recorded data, names a complex exactly when one sees the Moon above 10 degrees', () => {
    const samples = southPoleSamples();
    const highest = (i: number): number =>
      Math.max(
        ...(['moon-from-goldstone', 'moon-from-canberra', 'moon-from-madrid'] as const).map(
          (table) => fixtureRows(table)[i]?.elevation ?? Number.NEGATIVE_INFINITY,
        ),
      );
    expect(samples).toHaveLength(61 * 24);
    // A spot check every 50 hours keeps the test fast and still crosses every complex's pass.
    for (let i = 0; i < samples.length; i += 50) {
      expect(samples[i]?.dsn !== null).toBe(highest(i) > DSN_MIN_ELEVATION_DEG);
    }
    expect(new Set(samples.map((s) => s.dsn))).toEqual(new Set(['goldstone', 'canberra', 'madrid', null]));
  });
});
