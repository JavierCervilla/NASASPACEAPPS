/** Hand-made samples for boundary tests. */
import type { HourSample } from '../src/site.ts';
import { addHours } from '../src/time.ts';

/** First hour of every hand-made series. */
export const T0 = '2026-11-01T00:00:00Z';

/** One sample per `[sunEl, earthEl]` pair, hourly from {@link T0}. */
export function series(elevations: readonly (readonly [number, number])[]): HourSample[] {
  return elevations.map(([sunEl, earthEl], i) => ({
    t: addHours(T0, i),
    sunEl,
    sunAz: 0,
    earthEl,
    earthAz: 0,
    dsn: null,
  }));
}
