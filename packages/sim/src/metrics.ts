/** Per-range metrics of one site: shares of Sun, Earth and window, the longest blocks, and what comes next. */
import { groupBlocks, longestBlock } from './blocks.ts';
import type { HourSample, RangeMetrics, TimeBlock } from './site.ts';
import { hoursBetween, toMs } from './time.ts';
import { hasEarth, hasSun, isWindow } from './visibility.ts';

function percent(samples: readonly HourSample[], predicate: (sample: HourSample) => boolean): number {
  if (samples.length === 0) return 0;
  return (100 * samples.filter(predicate).length) / samples.length;
}

/** The first block starting at or after `at`, or `null`. */
export function nextBlock(blocks: readonly TimeBlock[], at: string): TimeBlock | null {
  const atMs = toMs(at);
  return blocks.find((block) => toMs(block.start) >= atMs) ?? null;
}

/**
 * Hours from `at` until the first sample where `predicate` stops holding. 0 when it does not hold at the first
 * sample at or after `at`; `null` when it holds until the end of the samples (or no sample is at or after `at`).
 * The resolution is the sampling step: one hour.
 */
export function hoursUntilLost(
  samples: readonly HourSample[],
  at: string,
  predicate: (sample: HourSample) => boolean,
): number | null {
  const atMs = toMs(at);
  const first = samples.findIndex((sample) => toMs(sample.t) >= atMs);
  if (first === -1) return null;
  const lost = samples.slice(first).find((sample) => !predicate(sample));
  return lost ? Math.max(0, hoursBetween(at, lost.t)) : null;
}

/** The metrics of a range of hourly samples, with `at` as the reference hour for what comes next. */
export function computeRangeMetrics(samples: readonly HourSample[], at: string): RangeMetrics {
  const windows = groupBlocks(samples, isWindow);
  return {
    hours: samples.length,
    sunPct: percent(samples, hasSun),
    earthPct: percent(samples, hasEarth),
    windowPct: percent(samples, isWindow),
    longestWindow: longestBlock(windows),
    longestNight: longestBlock(groupBlocks(samples, (sample) => !hasSun(sample))),
    at,
    nextWindow: nextBlock(windows, at),
    hoursUntilSunset: hoursUntilLost(samples, at, hasSun),
    hoursUntilEarthset: hoursUntilLost(samples, at, hasEarth),
  };
}
