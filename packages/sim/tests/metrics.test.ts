import { describe, expect, it } from 'vitest';
import { groupBlocks } from '../src/blocks.ts';
import { computeRangeMetrics, hoursUntilLost, nextBlock } from '../src/metrics.ts';
import { hasEarth, hasSun, isWindow } from '../src/visibility.ts';
import { T0, series } from './factories.ts';
import { southPoleSamples } from './fixtures.ts';

// Hours 0-1 window, 2 Sun only, 3 night with Earth, 4-6 window.
const SAMPLES = series([[1, 5], [1, 5], [1, 0], [-1, 5], [1, 5], [1, 5], [1, 5]]);

describe('computeRangeMetrics on hand-made hours', () => {
  const metrics = computeRangeMetrics(SAMPLES, T0);

  it('counts the shares of Sun, Earth and window', () => {
    expect(metrics.hours).toBe(7);
    expect(metrics.sunPct).toBeCloseTo((100 * 6) / 7);
    expect(metrics.earthPct).toBeCloseTo((100 * 6) / 7);
    expect(metrics.windowPct).toBeCloseTo((100 * 5) / 7);
  });

  it('finds the longest window and the longest night', () => {
    expect(metrics.longestWindow).toEqual({ start: '2026-11-01T04:00:00Z', end: '2026-11-01T07:00:00Z', hours: 3 });
    expect(metrics.longestNight).toEqual({ start: '2026-11-01T03:00:00Z', end: '2026-11-01T04:00:00Z', hours: 1 });
  });

  it('measures what comes next from the reference hour', () => {
    expect(metrics.nextWindow?.start).toBe(T0);
    expect(metrics.hoursUntilSunset).toBe(3);
    expect(metrics.hoursUntilEarthset).toBe(2);
  });

  it('is all zero and null for no hours', () => {
    expect(computeRangeMetrics([], T0)).toMatchObject({
      hours: 0,
      sunPct: 0,
      windowPct: 0,
      longestWindow: null,
      longestNight: null,
      nextWindow: null,
      hoursUntilSunset: null,
    });
  });
});

describe('nextBlock', () => {
  const windows = groupBlocks(SAMPLES, isWindow);

  it('returns the first block starting at or after the hour', () => {
    expect(nextBlock(windows, '2026-11-01T01:00:00Z')?.start).toBe('2026-11-01T04:00:00Z');
    expect(nextBlock(windows, '2026-11-01T04:00:00Z')?.start).toBe('2026-11-01T04:00:00Z');
  });

  it('is null when no block starts later', () => {
    expect(nextBlock(windows, '2026-11-01T05:00:00Z')).toBeNull();
  });
});

describe('hoursUntilLost', () => {
  it('is 0 when the body is already down', () => {
    expect(hoursUntilLost(SAMPLES, '2026-11-01T03:00:00Z', hasSun)).toBe(0);
  });

  it('is null when the body does not set within the range, or the hour is past the range', () => {
    expect(hoursUntilLost(SAMPLES, '2026-11-01T04:00:00Z', hasSun)).toBeNull();
    expect(hoursUntilLost(SAMPLES, '2026-11-02T00:00:00Z', hasEarth)).toBeNull();
  });

  it('counts from an hour that is not on the grid', () => {
    expect(hoursUntilLost(SAMPLES, '2026-11-01T00:30:00Z', hasSun)).toBe(2.5);
  });
});

describe('computeRangeMetrics on the recorded 89.5 S data (November and December 2026)', () => {
  const samples = southPoleSamples();
  const metrics = computeRangeMetrics(samples, T0);

  // In this southern summer the subsolar point sits about 1.5 degrees south of the equator, so from 89.5 S the Sun
  // circles the sky between about 0.9 and 2.0 degrees and never sets (see the validation test).
  it('has the Sun up every hour, so no night and no sunset', () => {
    expect(metrics.sunPct).toBe(100);
    expect(metrics.longestNight).toBeNull();
    expect(metrics.hoursUntilSunset).toBeNull();
  });

  it('has windows exactly when the Earth is up, since the Sun always is', () => {
    expect(metrics.windowPct).toBe(metrics.earthPct);
    expect(metrics.earthPct).toBeGreaterThan(20);
    expect(metrics.earthPct).toBeLessThan(60);
    const longest = metrics.longestWindow;
    expect(longest).not.toBeNull();
    // The Earth stays above 3 degrees for well under half of each ~27 day libration cycle.
    expect(longest?.hours).toBeGreaterThan(5 * 24);
    expect(longest?.hours).toBeLessThan(14 * 24);
  });

  it('starts with the Earth up, which then sets within three days', () => {
    expect(samples[0]?.earthEl).toBeGreaterThan(3);
    expect(metrics.hoursUntilEarthset).toBeGreaterThan(0);
    expect(metrics.hoursUntilEarthset).toBeLessThan(3 * 24);
    expect(metrics.nextWindow).not.toBeNull();
  });
});
