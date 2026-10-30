import { describe, expect, it, vi } from 'vitest';
import { keyControls } from '../src/globe/key-controls';
import { keyToMove } from '../src/globe/keys';
import { createLoop } from '../src/globe/loop';
import { createOrbit, poseOf } from '../src/globe/orbit';
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
