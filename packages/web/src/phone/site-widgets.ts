/**
 * The four phone widgets of a site, from its hourly samples and the hour
 * that counts as now. The month's shares come from `computeRangeMetrics`
 * in `@ventana/sim`.
 */
import { computeRangeMetrics, toMs, type HourSample } from '@ventana/sim';
import { bodyWidget, EARTH, SUN } from './body-widget';
import { dsnWidget } from './dsn-widget';
import { nowWidget } from './now-widget';
import type { SiteWidgets } from './widget-types';

/** The sample of the hour `at`: the first at or after it, or null. */
export function sampleAt(
  hours: readonly HourSample[],
  at: string,
): HourSample | null {
  const atMs = toMs(at);
  return hours.find((sample) => toMs(sample.t) >= atMs) ?? null;
}

/**
 * The widgets for the hour `at` of `hours` (one month), or null when no
 * sample covers it.
 */
export function siteWidgets(
  hours: readonly HourSample[],
  at: string,
  month: string,
): SiteWidgets | null {
  const now = sampleAt(hours, at);
  if (!now) return null;
  const metrics = computeRangeMetrics(hours, now.t);
  return {
    now: nowWidget(now, metrics.windowPct, month),
    sun: bodyWidget(SUN, hours, now),
    earth: bodyWidget(EARTH, hours, now),
    dsn: dsnWidget(hours, now),
  };
}
