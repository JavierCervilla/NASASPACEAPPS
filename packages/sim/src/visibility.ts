/**
 * Visibility rules of the spec («Ventana Lunar · Especificación y roadmap», restated in the scope of the VENT-3 plan):
 * Sun > 0°, Earth > 3°, window = both at once, DSN antenna = the complex that sees the Moon highest above 10°.
 */
import type { DsnComplex, HourSample } from './site.ts';

/** The Sun powers the lander when its elevation is above this, in degrees (spec: Sun > 0°). */
export const SUN_MIN_ELEVATION_DEG = 0;

/** The lander can talk to Earth when the Earth's elevation is above this, in degrees (spec: Earth > 3°). */
export const EARTH_MIN_ELEVATION_DEG = 3;

/** A DSN complex can track the Moon only above this elevation, in degrees (spec: DSN antenna above 10°). */
export const DSN_MIN_ELEVATION_DEG = 10;

/** Whether the Sun is up at a sample. */
export function hasSun(sample: Pick<HourSample, 'sunEl'>): boolean {
  return sample.sunEl > SUN_MIN_ELEVATION_DEG;
}

/** Whether the Earth is high enough for communication at a sample. */
export function hasEarth(sample: Pick<HourSample, 'earthEl'>): boolean {
  return sample.earthEl > EARTH_MIN_ELEVATION_DEG;
}

/** Whether a sample is a landing window: Sun and Earth at once. */
export function isWindow(sample: Pick<HourSample, 'sunEl' | 'earthEl'>): boolean {
  return hasSun(sample) && hasEarth(sample);
}

/**
 * The DSN complex listening to the Moon: the one that sees it highest, when that is above
 * {@link DSN_MIN_ELEVATION_DEG}; `null` when none does. Ties go to the first complex in `moonElevations` order.
 */
export function activeDsn(moonElevations: Readonly<Partial<Record<DsnComplex, number>>>): DsnComplex | null {
  let best: DsnComplex | null = null;
  let bestEl = DSN_MIN_ELEVATION_DEG;
  for (const [complex, el] of Object.entries(moonElevations) as [DsnComplex, number][]) {
    if (el > bestEl) {
      best = complex;
      bestEl = el;
    }
  }
  return best;
}
