/**
 * Drags become orbit moves: pixels to degrees, 1:1 at the centre of the
 * disc. A release becomes momentum only when the pointer was flicked, and
 * never under prefers-reduced-motion.
 */
import type { ControlDeps } from './control-deps';
import type { DragTarget } from './drag';
import { degreesPerPixel } from './framing';
import { flingOrbit, moveOrbit, type Orbit } from './orbit';

/** Release speeds below this, in px/s, are a placement, not a flick. */
const FLICK_MIN_PX_S = 120;

/** The drag handlers for `orbit`. */
export function pointerControls(orbit: Orbit, deps: ControlDeps): DragTarget {
  const scale = (): number =>
    degreesPerPixel(orbit.distance.value, deps.heightPx());
  return {
    drag: (dx, dy) => {
      const k = scale();
      const delta = { latDeg: dy * k, lonEastDeg: -dx * k, distance: 0 };
      moveOrbit(orbit, delta, true);
      deps.invalidate();
    },
    release: (vx, vy) => {
      if (deps.reducedMotion() || Math.hypot(vx, vy) < FLICK_MIN_PX_S) return;
      const k = scale();
      flingOrbit(orbit, { latDeg: vy * k, lonEastDeg: -vx * k });
      deps.invalidate();
    },
  };
}

/**
 * The orbit distance after the fingers spread by `ratio` (2 = twice as far
 * apart): the altitude above the surface shrinks by the same ratio.
 */
export function pinchDistance(distance: number, ratio: number): number {
  return 1 + (distance - 1) / ratio;
}

/** The pinch handler for `orbit`: the zoom tracks the fingers 1:1. */
export function pinchControls(
  orbit: Orbit,
  deps: ControlDeps,
): (ratio: number) => void {
  return (ratio) => {
    const from = orbit.distance.target;
    const distance = pinchDistance(from, ratio) - from;
    moveOrbit(orbit, { latDeg: 0, lonEastDeg: 0, distance }, true);
    deps.invalidate();
  };
}
