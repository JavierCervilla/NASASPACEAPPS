/**
 * The four phone widgets of a site, from the hourly samples of its
 * {@link WidgetRange}. «Right now», the countdowns and the DSN antenna read
 * the rolling horizon; the month's window share (`computeRangeMetrics` in
 * `@ventana/sim`) reads the calendar month only.
 */
import { computeRangeMetrics, toMs, type HourSample } from '@ventana/sim';
import { bodyWidget, EARTH, SUN } from './body-widget';
import { dsnWidget } from './dsn-widget';
import { nowWidget } from './now-widget';
import type { WidgetRange } from './widget-range';
import type { SiteWidgets } from './widget-types';

/** The sample of the hour `at`: the first at or after it, or null. */
export function sampleAt(
  hours: readonly HourSample[],
  at: string,
): HourSample | null {
  const atMs = toMs(at);
  return hours.find((sample) => toMs(sample.t) >= atMs) ?? null;
}

/** The samples from `first` to `last`, both ISO and inclusive. */
export function samplesWithin(
  hours: readonly HourSample[],
  first: string,
  last: string,
): HourSample[] {
  const [fromMs, toMsInclusive] = [toMs(first), toMs(last)];
  return hours.filter((sample) => {
    const ms = toMs(sample.t);
    return ms >= fromMs && ms <= toMsInclusive;
  });
}

/**
 * The widgets for the hour `range.at` of `hours` (the whole range), or
 * null when no sample covers it.
 */
export function siteWidgets(
  hours: readonly HourSample[],
  range: WidgetRange,
): SiteWidgets | null {
  const horizon = samplesWithin(hours, range.at, range.horizonEnd);
  const now = sampleAt(horizon, range.at);
  if (!now) return null;
  const month = samplesWithin(hours, range.from, range.monthEnd);
  const { windowPct } = computeRangeMetrics(month, now.t);
  return {
    now: nowWidget(now, windowPct, range.month),
    sun: bodyWidget(SUN, horizon, now),
    earth: bodyWidget(EARTH, horizon, now),
    dsn: dsnWidget(horizon, now),
  };
}
