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
 * The camera orbit as three springs (latitude, longitude, distance), each on
 * its own axis (apple-design: decompose 2D motion). A drag moves the values
 * 1:1; a release hands its velocity to the springs; keys and the wheel move
 * the targets and the springs follow.
 */
import { movedPose, type OrbitPose } from './framing';
import { projectMomentum, stepSpring, type SpringAxis } from './spring';

export interface Orbit {
  readonly lat: SpringAxis;
  readonly lon: SpringAxis;
  readonly distance: SpringAxis;
}

/** A change of pose: degrees, degrees and Moon radii. */
export type PoseDelta = OrbitPose;

/** Spring response, in seconds (apple-design: rotation, 0.4 s). */
const RESPONSE_S = 0.4;
/** Flick deceleration per ms: snappier than a scroll, a globe is heavy. */
const FLICK_RATE = 0.995;

/** An orbit at rest at `pose`. */
export function createOrbit(pose: OrbitPose): Orbit {
  const axis = (value: number): SpringAxis => ({
    value,
    velocity: 0,
    target: value,
  });
  return {
    lat: axis(pose.latDeg),
    lon: axis(pose.lonEastDeg),
    distance: axis(pose.distance),
  };
}

/** Where the camera is now (the springs' live values). */
export function poseOf(orbit: Orbit): OrbitPose {
  return {
    latDeg: orbit.lat.value,
    lonEastDeg: orbit.lon.value,
    distance: orbit.distance.value,
  };
}

/** Where a move by `delta` from `from` lands (`movedPose`: held inside). */
export type PlacePose = (from: OrbitPose, delta: PoseDelta) => OrbitPose;

/**
 * Moves the targets by `delta`, placed by `place` (held at the limits, or
 * stretched past them: orbit-band.ts). With `follow` (a drag) the values
 * jump with them and stop: the globe stays glued to the pointer.
 */
export function moveOrbit(
  orbit: Orbit,
  delta: PoseDelta,
  follow: boolean,
  place: PlacePose = movedPose,
): void {
  const from = {
    latDeg: orbit.lat.target,
    lonEastDeg: orbit.lon.target,
    distance: orbit.distance.target,
  };
  const target = place(from, delta);
  const pairs: [SpringAxis, number][] = [
    [orbit.lat, target.latDeg],
    [orbit.lon, target.lonEastDeg],
    [orbit.distance, target.distance],
  ];
  for (const [spring, value] of pairs) {
    spring.target = value;
    if (follow) Object.assign(spring, { value, velocity: 0 });
  }
}

/**
 * A drag released at `velocity` (degrees per second): the springs inherit it
 * and settle where the flick projects, held inside the limits.
 */
export function flingOrbit(
  orbit: Orbit,
  velocity: { latDeg: number; lonEastDeg: number },
): void {
  orbit.lat.velocity = velocity.latDeg;
  orbit.lon.velocity = velocity.lonEastDeg;
  moveOrbit(
    orbit,
    {
      latDeg: projectMomentum(velocity.latDeg, FLICK_RATE),
      lonEastDeg: projectMomentum(velocity.lonEastDeg, FLICK_RATE),
      distance: 0,
    },
    false,
  );
}

/** Advances the springs by `dt` seconds; true while any of them moves. */
export function stepOrbit(orbit: Orbit, dt: number): boolean {
  const moving = [orbit.lat, orbit.lon, orbit.distance].map((spring) =>
    stepSpring(spring, dt, RESPONSE_S),
  );
  return moving.some(Boolean);
}
