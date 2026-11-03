/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * Keys and the wheel move the springs' targets, and the springs follow.
 * Under prefers-reduced-motion the move lands at once instead. The wheel,
 * a hand like a pinch, stretches past the zoom's ends (orbit-band.ts) and
 * settles back once it rests; keys stop at the limits.
 */
import { afterRest, BROWSER_TIMERS, type Timers } from '../lib/timers';
import type { ControlDeps } from './control-deps';
import { zoomedDistance } from './framing';
import type { KeyTarget } from './keys';
import { moveOrbit, type Orbit, type PlacePose } from './orbit';
import { settleOnRelease, stretchPose } from './orbit-band';

/** How long the wheel rests before a stretched zoom settles, ms. */
export const WHEEL_REST_MS = 150;

/** Zooms `orbit` by `steps`, placed by `place` (held at the limits). */
function zoomOrbit(
  orbit: Orbit,
  deps: ControlDeps,
  steps: number,
  place?: PlacePose,
): void {
  const from = orbit.distance.target;
  const distance = zoomedDistance(from, steps) - from;
  const delta = { latDeg: 0, lonEastDeg: 0, distance };
  moveOrbit(orbit, delta, deps.reducedMotion(), place);
  deps.invalidate();
}

/** The key and wheel handlers for `orbit`. */
export function keyControls(
  orbit: Orbit,
  deps: ControlDeps,
  timers: Timers = BROWSER_TIMERS,
): KeyTarget {
  const rest = afterRest(settleOnRelease(orbit, deps), WHEEL_REST_MS, timers);
  return {
    rotate: (delta) => {
      moveOrbit(orbit, { ...delta, distance: 0 }, deps.reducedMotion());
      deps.invalidate();
    },
    zoom: (steps) => zoomOrbit(orbit, deps, steps),
    wheel: (steps) => {
      if (deps.reducedMotion()) return zoomOrbit(orbit, deps, steps);
      zoomOrbit(orbit, deps, steps, stretchPose);
      rest();
    },
  };
}
