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

// The globe's soft limits (VENT-55, apple-design §9): past the pole tilt or the zoom's ends a drag, a pinch or the
// wheel keeps moving the Moon, progressively less, with the sheet's rubber band; let go and it settles back on the
// limit on the orbit's springs (at once under reduced motion).
import { describe, expect, it, vi } from 'vitest';
import { LIMITS, SOUTH_POLE_VIEW } from '../src/globe/framing';
import { createOrbit, moveOrbit, poseOf, stepOrbit } from '../src/globe/orbit';
import { bandValue, fingerOf, GIVE, settleOrbit, stretchPose } from '../src/globe/orbit-band';
import { pinchControls, pinchEnd, pointerControls } from '../src/globe/pointer-controls';
import { keyControls } from '../src/globe/key-controls';

const FRAME_S = 1 / 60;
const LAT = { min: -LIMITS.maxLatDeg, max: LIMITS.maxLatDeg, below: GIVE.latDeg, above: GIVE.latDeg };

const deps = (reducedMotion: boolean) => ({ invalidate: vi.fn(), reducedMotion: () => reducedMotion, heightPx: () => 800 });

/** Steps the orbit until it rests; the frames it took. */
function settle(orbit: ReturnType<typeof createOrbit>): number {
  let frames = 0;
  while (stepOrbit(orbit, FRAME_S) && frames < 600) frames += 1;
  return frames;
}

describe('bandValue and fingerOf', () => {
  it('leave a value inside the limits alone', () => {
    expect(bandValue(-40, LAT)).toBe(-40);
    expect(fingerOf(-40, LAT)).toBe(-40);
  });

  it('give less and less past a limit, and never the whole give', () => {
    const first = bandValue(-86, LAT);
    const far = bandValue(-185, LAT);
    expect(first).toBeLessThan(-85);
    expect(first).toBeGreaterThan(-86);
    expect(far).toBeGreaterThan(-85 - GIVE.latDeg);
    expect(bandValue(-86, LAT) - bandValue(-87, LAT)).toBeGreaterThan(bandValue(-95, LAT) - bandValue(-96, LAT));
  });

  it('undo each other, so a pose grabbed mid-stretch does not jump', () => {
    for (const finger of [-86, -90, -120, 88, 100]) expect(fingerOf(bandValue(finger, LAT), LAT)).toBeCloseTo(finger, 9);
  });
});

describe('stretchPose', () => {
  it('moves 1:1 inside the limits', () => {
    expect(stretchPose(SOUTH_POLE_VIEW, { latDeg: 5, lonEastDeg: -7, distance: 1 })).toEqual({
      latDeg: -57, lonEastDeg: 23, distance: 6,
    });
  });

  it('never crosses the pole nor reaches the surface, however far the finger goes', () => {
    const pose = stretchPose(SOUTH_POLE_VIEW, { latDeg: -400, lonEastDeg: 0, distance: -50 });
    expect(pose.latDeg).toBeLessThan(-LIMITS.maxLatDeg);
    expect(pose.latDeg).toBeGreaterThan(-90);
    expect(pose.distance).toBeLessThan(LIMITS.minDistance);
    expect(pose.distance).toBeGreaterThan(1);
    expect(stretchPose(SOUTH_POLE_VIEW, { latDeg: 0, lonEastDeg: 0, distance: 99 }).distance).toBeGreaterThan(LIMITS.maxDistance);
  });

  it('adds the next move to where the finger is, not to the banded pose', () => {
    const once = stretchPose(SOUTH_POLE_VIEW, { latDeg: -40, lonEastDeg: 0, distance: 0 });
    const twice = stretchPose(stretchPose(SOUTH_POLE_VIEW, { latDeg: -20, lonEastDeg: 0, distance: 0 }), {
      latDeg: -20, lonEastDeg: 0, distance: 0,
    });
    expect(twice.latDeg).toBeCloseTo(once.latDeg, 9);
  });
});

describe('the orbit at its limits', () => {
  it('follows a drag past the pole with resistance, then springs back to the limit on release', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    controls.drag(0, -2000);
    const stretched = poseOf(orbit).latDeg;
    expect(stretched).toBeLessThan(-LIMITS.maxLatDeg);
    controls.release(0, 0);
    expect(poseOf(orbit).latDeg).toBe(stretched);
    expect(settle(orbit)).toBeGreaterThan(5);
    expect(poseOf(orbit).latDeg).toBe(-LIMITS.maxLatDeg);
  });

  it('lands on the limit at once under reduced motion', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(true));
    controls.drag(0, -2000);
    controls.release(0, 0);
    expect(poseOf(orbit).latDeg).toBe(-LIMITS.maxLatDeg);
    expect(stepOrbit(orbit, FRAME_S)).toBe(false);
  });

  it('a flick past the limit still comes to rest on it', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    controls.drag(0, -2000);
    controls.release(0, -900);
    settle(orbit);
    expect(poseOf(orbit).latDeg).toBe(-LIMITS.maxLatDeg);
  });

  it('a press that stops a flick from a stretch still settles on the limit', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    controls.drag(0, -2000);
    controls.release(0, -900);
    stepOrbit(orbit, FRAME_S);
    expect(controls.press?.()).toBe(true);
    settle(orbit);
    expect(poseOf(orbit).latDeg).toBe(-LIMITS.maxLatDeg);
  });

  it('pinches past the closest zoom with resistance, and settles back when the fingers lift', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const d = deps(false);
    const zoom = pinchControls(orbit, d);
    for (let i = 0; i < 12; i += 1) zoom(1.5);
    const stretched = poseOf(orbit).distance;
    expect(stretched).toBeLessThan(LIMITS.minDistance);
    expect(stretched).toBeGreaterThan(LIMITS.minDistance - GIVE.nearDistance);
    pinchEnd(orbit, d)();
    expect(d.invalidate).toHaveBeenCalled();
    settle(orbit);
    expect(poseOf(orbit).distance).toBe(LIMITS.minDistance);
  });

  it('settleOrbit leaves a pose inside the limits untouched', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    expect(settleOrbit(orbit, false)).toBe(false);
    expect(stepOrbit(orbit, FRAME_S)).toBe(false);
  });

  it('keys still stop at the limit: a key is no finger', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    moveOrbit(orbit, { latDeg: -90, lonEastDeg: 0, distance: 0 }, true);
    expect(poseOf(orbit).latDeg).toBe(-LIMITS.maxLatDeg);
  });
});

describe('the wheel at the zoom\'s ends', () => {
  it('stretches past the farthest zoom and settles back once the wheel rests', () => {
    vi.useFakeTimers();
    try {
      const orbit = createOrbit({ ...SOUTH_POLE_VIEW, distance: LIMITS.maxDistance });
      const controls = keyControls(orbit, deps(false));
      controls.wheel(4);
      expect(orbit.distance.target).toBeGreaterThan(LIMITS.maxDistance);
      vi.advanceTimersByTime(50);
      controls.wheel(4);
      vi.advanceTimersByTime(100);
      expect(orbit.distance.target).toBeGreaterThan(LIMITS.maxDistance);
      vi.advanceTimersByTime(200);
      expect(orbit.distance.target).toBe(LIMITS.maxDistance);
      settle(orbit);
      expect(poseOf(orbit).distance).toBe(LIMITS.maxDistance);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops dead at the limit under reduced motion', () => {
    const orbit = createOrbit({ ...SOUTH_POLE_VIEW, distance: LIMITS.maxDistance });
    keyControls(orbit, deps(true)).wheel(4);
    expect(poseOf(orbit).distance).toBe(LIMITS.maxDistance);
  });
});
