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

import { describe, expect, it, vi } from 'vitest';
import { keyControls } from '../src/globe/key-controls';
import { keyToMove } from '../src/globe/keys';
import { createLoop } from '../src/globe/loop';
import { createOrbit, moveOrbit, poseOf, stepOrbit } from '../src/globe/orbit';
import { pointerControls } from '../src/globe/pointer-controls';
import { SOUTH_POLE_VIEW } from '../src/globe/framing';

const deps = (reduced: boolean) => ({ invalidate: vi.fn(), reducedMotion: () => reduced, heightPx: () => 800 });

describe('keyToMove', () => {
  it('turns the view toward the arrow', () => {
    expect(keyToMove('ArrowRight')).toEqual({ rotate: { latDeg: 0, lonEastDeg: 10 } });
    expect(keyToMove('ArrowUp')).toEqual({ rotate: { latDeg: 10, lonEastDeg: 0 } });
  });

  it('zooms in on plus and out on minus, and ignores other keys', () => {
    expect(keyToMove('+')).toEqual({ zoom: -2 });
    expect(keyToMove('-')).toEqual({ zoom: 2 });
    expect(keyToMove('a')).toBeNull();
  });
});

describe('pointerControls', () => {
  it('drags right to bring the west into view, and asks for a frame', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const d = deps(false);
    pointerControls(orbit, d).drag(40, 0);
    expect(poseOf(orbit).lonEastDeg).toBeLessThan(SOUTH_POLE_VIEW.lonEastDeg);
    expect(d.invalidate).toHaveBeenCalledOnce();
  });

  it('drags down to tilt the view north', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    pointerControls(orbit, deps(false)).drag(0, 40);
    expect(poseOf(orbit).latDeg).toBeGreaterThan(SOUTH_POLE_VIEW.latDeg);
    expect(poseOf(orbit).lonEastDeg).toBe(SOUTH_POLE_VIEW.lonEastDeg);
  });

  it('adds momentum to a flick, but not under reduced motion or after a slow release', () => {
    const flicked = createOrbit(SOUTH_POLE_VIEW);
    pointerControls(flicked, deps(false)).release(800, 0);
    expect(flicked.lon.velocity).not.toBe(0);

    const reduced = createOrbit(SOUTH_POLE_VIEW);
    pointerControls(reduced, deps(true)).release(800, 0);
    expect(reduced.lon).toEqual({ value: 30, velocity: 0, target: 30 });

    const slow = createOrbit(SOUTH_POLE_VIEW);
    pointerControls(slow, deps(false)).release(50, 0);
    expect(slow.lon.velocity).toBe(0);
  });
});

describe('a press on the turning globe', () => {
  it('stops a flick where it is, and says it did, once', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const d = deps(false);
    const controls = pointerControls(orbit, d);
    controls.release(800, 300);
    stepOrbit(orbit, 0.05);
    const at = poseOf(orbit);
    expect(controls.press?.()).toBe(true);
    expect(orbit.lon).toEqual({ value: at.lonEastDeg, velocity: 0, target: at.lonEastDeg });
    expect(orbit.lat).toEqual({ value: at.latDeg, velocity: 0, target: at.latDeg });
    expect(d.invalidate).toHaveBeenCalledTimes(2);
    expect(controls.press?.()).toBe(false);
  });

  it('is nothing to stop on a globe at rest, after a slow release or a plain drag', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    expect(controls.press?.()).toBe(false);
    controls.release(50, 0);
    expect(controls.press?.()).toBe(false);
    controls.drag(40, 0);
    expect(controls.press?.()).toBe(false);
  });

  it('is nothing to stop once the flick has settled', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    controls.release(800, 0);
    for (let i = 0; i < 600; i++) stepOrbit(orbit, 1 / 60);
    expect(controls.press?.()).toBe(false);
  });

  const frame = (orbit: ReturnType<typeof createOrbit>) =>
    moveOrbit(orbit, { latDeg: -8, lonEastDeg: 20, distance: 0 }, false);
  const expectFraming = (orbit: ReturnType<typeof createOrbit>, controls: ReturnType<typeof pointerControls>) => {
    stepOrbit(orbit, 0.05);
    const target = orbit.lon.target;
    expect(controls.press?.()).toBe(false);
    expect(orbit.lon.target).toBe(target);
    expect(orbit.lon.value).not.toBe(target);
  };

  it('never stops a site being framed, without a flick', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    frame(orbit);
    expectFraming(orbit, controls);
  });

  it('lets a framing go on after a flick that settled by itself', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const controls = pointerControls(orbit, deps(false));
    controls.release(800, 0);
    for (let i = 0; i < 600; i++) stepOrbit(orbit, 1 / 60);
    frame(orbit);
    expectFraming(orbit, controls);
  });

  it('lets a framing or a key turn that takes over a flick go on', () => {
    const framed = createOrbit(SOUTH_POLE_VIEW);
    const byFrame = pointerControls(framed, deps(false));
    byFrame.release(800, 0);
    stepOrbit(framed, 0.05);
    frame(framed);
    expectFraming(framed, byFrame);

    const keyed = createOrbit(SOUTH_POLE_VIEW);
    const byKey = pointerControls(keyed, deps(false));
    byKey.release(800, 0);
    stepOrbit(keyed, 0.05);
    keyControls(keyed, deps(false)).rotate({ latDeg: 0, lonEastDeg: 10 });
    expectFraming(keyed, byKey);
  });
});

describe('keyControls', () => {
  it('springs under normal motion and jumps under reduced motion', () => {
    const springy = createOrbit(SOUTH_POLE_VIEW);
    keyControls(springy, deps(false)).rotate({ latDeg: 10, lonEastDeg: 0 });
    expect(springy.lat.value).toBe(-62);
    expect(springy.lat.target).toBe(-52);

    const instant = createOrbit(SOUTH_POLE_VIEW);
    keyControls(instant, deps(true)).zoom(-2);
    expect(instant.distance.value).toBeLessThan(SOUTH_POLE_VIEW.distance);
    expect(instant.distance.value).toBe(instant.distance.target);
  });

  it('lands an arrow-key turn at once under reduced motion', () => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    keyControls(orbit, deps(true)).rotate({ latDeg: 10, lonEastDeg: 10 });
    expect(orbit.lat.value).toBe(orbit.lat.target);
    expect(orbit.lon.value).toBe(orbit.lon.target);
    expect(orbit.lon.value).toBe(SOUTH_POLE_VIEW.lonEastDeg + 10);
  });
});

describe('createLoop', () => {
  it('draws only when asked, and keeps going only while the frame moves', () => {
    const queue: ((now: number) => void)[] = [];
    const schedule = (fn: (now: number) => void) => queue.push(fn);
    const frames: number[] = [];
    const loop = createLoop((dt) => frames.push(dt) < 3, schedule, () => undefined);
    expect(queue).toHaveLength(0);
    loop.invalidate();
    loop.invalidate();
    expect(queue).toHaveLength(1);
    queue.shift()?.(1000);
    queue.shift()?.(1016);
    queue.shift()?.(1032);
    expect(queue).toHaveLength(0);
    expect(frames).toHaveLength(3);
    expect(frames[0]).toBe(0);
    expect(frames[1]).toBeCloseTo(0.016, 9);
  });

  it('schedules nothing after stop', () => {
    const queue: unknown[] = [];
    const loop = createLoop(() => true, (fn) => queue.push(fn), () => undefined);
    loop.stop();
    loop.invalidate();
    expect(queue).toHaveLength(0);
  });
});
