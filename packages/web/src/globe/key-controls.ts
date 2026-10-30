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
