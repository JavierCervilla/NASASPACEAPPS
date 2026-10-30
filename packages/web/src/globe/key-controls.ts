/**
 * Keys and the wheel move the springs' targets, and the springs follow.
 * Under prefers-reduced-motion the move lands at once instead.
 */
import type { ControlDeps } from './control-deps';
import { zoomedDistance } from './framing';
import type { KeyTarget } from './keys';
import { moveOrbit, type Orbit } from './orbit';

/** The key and wheel handlers for `orbit`. */
export function keyControls(orbit: Orbit, deps: ControlDeps): KeyTarget {
  return {
    rotate: (delta) => {
      moveOrbit(orbit, { ...delta, distance: 0 }, deps.reducedMotion());
      deps.invalidate();
    },
    zoom: (steps) => {
      const from = orbit.distance.target;
      const distance = zoomedDistance(from, steps) - from;
      const delta = { latDeg: 0, lonEastDeg: 0, distance };
      moveOrbit(orbit, delta, deps.reducedMotion());
      deps.invalidate();
    },
  };
}
