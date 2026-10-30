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

import { describe, expect, it } from 'vitest';
import { SOUTH_POLE_VIEW } from '../src/globe/framing';
import { createOrbit, flingOrbit, moveOrbit, poseOf, stepOrbit } from '../src/globe/orbit';
import { projectMomentum, stepSpring, type SpringAxis } from '../src/globe/spring';
import { VelocityTracker } from '../src/globe/velocity';

const FRAME_S = 1 / 60;

function settle(step: () => boolean, maxFrames = 600): number {
  for (let frame = 1; frame <= maxFrames; frame += 1) if (!step()) return frame;
  return Infinity;
}

describe('stepSpring (critically damped)', () => {
  it('reaches its target without overshoot', () => {
    const axis: SpringAxis = { value: 0, velocity: 0, target: 10 };
    let highest = 0;
    const frames = settle(() => {
      const moving = stepSpring(axis, FRAME_S, 0.4);
      highest = Math.max(highest, axis.value);
      return moving;
    });
    expect(frames).toBeLessThan(120);
    expect(highest).toBeLessThanOrEqual(10);
    expect(axis).toEqual({ value: 10, velocity: 0, target: 10 });
  });

  it('carries the velocity it is handed (no seam after a drag)', () => {
    const axis: SpringAxis = { value: 0, velocity: 50, target: 0 };
    stepSpring(axis, FRAME_S, 0.4);
    expect(axis.value).toBeGreaterThan(0);
  });

  it('lands in the same place whatever the frame rate', () => {
    const a: SpringAxis = { value: 0, velocity: 0, target: 1 };
    const b: SpringAxis = { value: 0, velocity: 0, target: 1 };
    for (let i = 0; i < 6; i += 1) stepSpring(a, 1 / 60, 0.4);
    stepSpring(b, 6 / 60, 0.4);
    expect(a.value).toBeCloseTo(b.value, 9);
  });
});

describe('projectMomentum', () => {
  it('throws further the faster the flick, in the flick direction', () => {
    expect(projectMomentum(100)).toBeGreaterThan(0);
    expect(projectMomentum(-200)).toBeCloseTo(-2 * projectMomentum(100), 9);
    expect(projectMomentum(0)).toBe(0);
  });
});

describe('the orbit', () => {
  it('follows a drag 1:1, with nothing left to animate', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    moveOrbit(orbit, { latDeg: 5, lonEastDeg: -7, distance: 0 }, true);
    expect(poseOf(orbit)).toEqual({ ...SOUTH_POLE_VIEW, latDeg: -57, lonEastDeg: 23 });
    expect(stepOrbit(orbit, FRAME_S)).toBe(false);
  });

  it('springs to a key move instead of jumping', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    moveOrbit(orbit, { latDeg: 10, lonEastDeg: 0, distance: 0 }, false);
    expect(poseOf(orbit).latDeg).toBe(SOUTH_POLE_VIEW.latDeg);
    expect(stepOrbit(orbit, FRAME_S)).toBe(true);
    expect(settle(() => stepOrbit(orbit, FRAME_S))).toBeLessThan(120);
    expect(poseOf(orbit).latDeg).toBe(-52);
  });

  it('keeps coasting after a flick and comes to rest inside the limits', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    flingOrbit(orbit, { latDeg: -400, lonEastDeg: 90 });
    stepOrbit(orbit, FRAME_S);
    expect(poseOf(orbit).lonEastDeg).toBeGreaterThan(SOUTH_POLE_VIEW.lonEastDeg);
    settle(() => stepOrbit(orbit, FRAME_S));
    expect(poseOf(orbit).latDeg).toBe(-85);
  });
});

describe('VelocityTracker', () => {
  it('measures the last 100 ms of the gesture, in px/s', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 0);
    tracker.add(500, 0, 200);
    tracker.add(510, 0, 250);
    tracker.add(530, 20, 300);
    expect(tracker.velocity(300)).toEqual({ x: 300, y: 200 });
  });

  it('reads zero when the pointer rested before release', () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0, 0);
    tracker.add(100, 0, 16);
    expect(tracker.velocity(400)).toEqual({ x: 0, y: 0 });
  });
});
