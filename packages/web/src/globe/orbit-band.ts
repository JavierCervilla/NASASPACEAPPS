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
 * The orbit's soft limits (apple-design §9): past the pole tilt or the
 * zoom's ends, a drag, a pinch or the wheel keeps moving the Moon,
 * progressively less, with the sheet's rubber band (sheet-physics.ts);
 * let go and it settles back on the limit on the orbit's springs. Keys and
 * the framer still stop at the limits (`clampPose`): only a hand stretches.
 * Pure but for `settleOrbit`, which writes the springs' targets.
 */
import { rubberBand } from '../sheet/sheet-physics';
import { clampPose, LIMITS, type OrbitPose } from './framing';
import type { ControlDeps } from './control-deps';
import type { Orbit, PoseDelta } from './orbit';

/**
 * The most a pose can stretch past each limit: under the 5° left to the
 * pole (north would flip), and well short of the surface.
 */
export const GIVE = { latDeg: 3, nearDistance: 0.25, farDistance: 1.5 };

/** The sheet's resistance (sheet-physics.ts), for the inverse. */
const RESISTANCE = 0.55;

/** An axis's limits and how far past each it can stretch. */
export interface AxisBand {
  readonly min: number;
  readonly max: number;
  readonly below: number;
  readonly above: number;
}

const LAT_BAND: AxisBand = {
  min: -LIMITS.maxLatDeg,
  max: LIMITS.maxLatDeg,
  below: GIVE.latDeg,
  above: GIVE.latDeg,
};

const DISTANCE_BAND: AxisBand = {
  min: LIMITS.minDistance,
  max: LIMITS.maxDistance,
  below: GIVE.nearDistance,
  above: GIVE.farDistance,
};

/** What shows for a finger at `finger`: 1:1 inside, resisted past. */
export function bandValue(finger: number, band: AxisBand): number {
  if (finger < band.min) {
    return rubberBand(finger, { min: band.min, max: Infinity }, band.below);
  }
  return rubberBand(finger, { min: -Infinity, max: band.max }, band.above);
}

/** The finger that {@link bandValue} shows at `shown`: its inverse. */
export function fingerOf(shown: number, band: AxisBand): number {
  const over = (by: number, give: number): number =>
    (by * give) / (RESISTANCE * Math.max(give - by, give * 1e-9));
  if (shown < band.min) return band.min - over(band.min - shown, band.below);
  if (shown > band.max) return band.max + over(shown - band.max, band.above);
  return shown;
}

/** A hand's move by `delta` from `from`: added to the finger, banded. */
export function stretchPose(from: OrbitPose, delta: PoseDelta): OrbitPose {
  const along = (shown: number, by: number, band: AxisBand): number =>
    bandValue(fingerOf(shown, band) + by, band);
  return {
    latDeg: along(from.latDeg, delta.latDeg, LAT_BAND),
    lonEastDeg: from.lonEastDeg + delta.lonEastDeg,
    distance: along(from.distance, delta.distance, DISTANCE_BAND),
  };
}

/**
 * The hand let go: the targets go back inside the limits, and the springs
 * carry the stretched values home (at once with `instant`, for reduced
 * motion). True when a target moved.
 */
export function settleOrbit(orbit: Orbit, instant: boolean): boolean {
  const held = clampPose({
    latDeg: orbit.lat.target,
    lonEastDeg: orbit.lon.target,
    distance: orbit.distance.target,
  });
  const pairs = [
    [orbit.lat, held.latDeg],
    [orbit.distance, held.distance],
  ] as const;
  let moved = false;
  for (const [spring, value] of pairs) {
    moved ||= spring.target !== value;
    spring.target = value;
    if (instant) Object.assign(spring, { value, velocity: 0 });
  }
  return moved;
}

/**
 * What a hand's release does: the orbit settles back inside its limits
 * (at once under reduced motion), and a frame is asked if it moved.
 */
export function settleOnRelease(orbit: Orbit, deps: ControlDeps) {
  return (): void => {
    if (settleOrbit(orbit, deps.reducedMotion())) deps.invalidate();
  };
}
