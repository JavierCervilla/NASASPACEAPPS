import { describe, expect, it, vi } from 'vitest';
import { stepDampedSpring } from '../src/sheet/damped-spring';
import { SheetMotion } from '../src/sheet/sheet-motion';
import { detentsFor, nearestDetent, releaseDetent, rubberBand, unRubberBand } from '../src/sheet/sheet-physics';
import { createSheetState, dragSheet, FLICK_MIN_PX_S, grabSheet, settleSheet, stepSheet, type SheetState } from '../src/sheet/sheet-state';
import { grabberLabel, nextDetent, openness } from '../src/sheet/sheet-view';

// The e2e and canvas phone: 390x844.
const HEIGHT = 844;
const DETENTS = detentsFor(HEIGHT);
const BOUNDS = { min: DETENTS.full, max: DETENTS.peek };
const FRAME_S = 1 / 60;

/** Runs the spring until it rests (or two seconds pass); the values it went through. */
function run(state: SheetState): number[] {
  const values: number[] = [];
  for (let frame = 0; frame < 120 && stepSheet(state, FRAME_S); frame += 1) values.push(state.axis.value);
  return values;
}

describe('detents', () => {
  it('sit where the canvas puts the sheet: full under the bar, half 344 px, peek 136 px', () => {
    expect(DETENTS).toEqual({ full: 96, half: 500, peek: 708 });
  });

  it('never cross on a short viewport', () => {
    const tiny = detentsFor(300);
    expect(tiny.full).toBeLessThanOrEqual(tiny.half);
    expect(tiny.half).toBeLessThanOrEqual(tiny.peek);
  });

  it('pick the nearest one', () => {
    expect(nearestDetent(DETENTS, 480)).toBe('half');
    expect(nearestDetent(DETENTS, 200)).toBe('full');
    expect(nearestDetent(DETENTS, 900)).toBe('peek');
  });
});

describe('momentum projection', () => {
  it('settles a slow release on the nearest detent', () => {
    expect(releaseDetent(DETENTS, 420, 0)).toBe('half');
  });

  it('throws a flick up from half to full, and down from half to peek', () => {
    expect(releaseDetent(DETENTS, 480, -1500)).toBe('full');
    expect(releaseDetent(DETENTS, 520, 1200)).toBe('peek');
  });

  it('lets a flick against the position win over the nearest detent', () => {
    // At 330 px the nearest detent is half, but a firm upward flick goes to full.
    expect(releaseDetent(DETENTS, 330, -800)).toBe('full');
  });

  it('decelerates at 0.995: a firm flick from peek crosses one detent, where 0.998 would cross two', () => {
    // 0.995 projects -1500 px/s by 298.5 px (to 409.5, half); 0.998 would project 748.5 px (to -40.5, full).
    expect(releaseDetent(DETENTS, DETENTS.peek, -1500)).toBe('half');
  });
});

describe('rubber band', () => {
  it('follows 1:1 between the ends', () => {
    expect(rubberBand(400, BOUNDS, HEIGHT)).toBe(400);
  });

  it('uses the 0.55 stiffness: 100 px past full shows 51.6 px past it', () => {
    // 96 - (100 * 844 * 0.55) / (844 + 0.55 * 100)
    expect(rubberBand(DETENTS.full - 100, BOUNDS, HEIGHT)).toBeCloseTo(44.364849833, 6);
  });

  it('resists more the further past an end the finger goes', () => {
    const near = DETENTS.full - rubberBand(DETENTS.full - 50, BOUNDS, HEIGHT);
    const far = DETENTS.full - rubberBand(DETENTS.full - 300, BOUNDS, HEIGHT);
    expect(near).toBeLessThan(50);
    expect(far).toBeLessThan(300);
    expect(far / 300).toBeLessThan(near / 50);
    expect(rubberBand(DETENTS.peek + 100, BOUNDS, HEIGHT)).toBeLessThan(DETENTS.peek + 100);
  });

  it('is undone by its inverse, so a sheet caught mid-bounce does not jump', () => {
    for (const finger of [DETENTS.full - 120, DETENTS.peek + 80, 400]) {
      const shown = rubberBand(finger, BOUNDS, HEIGHT);
      expect(unRubberBand(shown, BOUNDS, HEIGHT)).toBeCloseTo(finger, 6);
    }
  });
});

describe('damped spring', () => {
  it('settles without overshoot when critically damped', () => {
    const axis = { value: 0, velocity: 0, target: 100 };
    let max = 0;
    while (stepDampedSpring(axis, FRAME_S, { response: 0.3, damping: 1 })) max = Math.max(max, axis.value);
    expect(max).toBeLessThanOrEqual(100);
    expect(axis.value).toBe(100);
  });

  it('overshoots a little when underdamped, then rests on the target', () => {
    const axis = { value: 0, velocity: 0, target: 100 };
    let max = 0;
    while (stepDampedSpring(axis, FRAME_S, { response: 0.3, damping: 0.8 })) max = Math.max(max, axis.value);
    expect(max).toBeGreaterThan(100);
    expect(max).toBeLessThan(105);
    expect(axis.value).toBe(100);
  });
});

describe('sheet state', () => {
  it('follows the finger 1:1 inside the detents and bands past them', () => {
    const state = createSheetState(DETENTS, 'half');
    grabSheet(state, HEIGHT);
    dragSheet(state, -100, HEIGHT);
    expect(state.axis.value).toBe(DETENTS.half - 100);
    dragSheet(state, -500, HEIGHT);
    expect(state.axis.value).toBeLessThan(DETENTS.full);
    expect(state.axis.value).toBeGreaterThan(DETENTS.half - 600);
  });

  it('hands the release velocity to the spring', () => {
    const state = createSheetState(DETENTS, 'half');
    settleSheet(state, 'full', -1500, false);
    expect(state.axis.velocity).toBe(-1500);
    expect(state.axis.target).toBe(DETENTS.full);
  });

  it('bounces only after a flick', () => {
    const flicked = createSheetState(DETENTS, 'half');
    settleSheet(flicked, 'full', -1500, false);
    expect(Math.min(...run(flicked))).toBeLessThan(DETENTS.full);
    const placed = createSheetState(DETENTS, 'half');
    settleSheet(placed, 'full', -100, false);
    expect(Math.min(...run(placed))).toBeGreaterThanOrEqual(DETENTS.full);
    expect(placed.axis.value).toBe(DETENTS.full);
  });

  it('can be caught mid-animation: a grab stops it where it is', () => {
    const state = createSheetState(DETENTS, 'half');
    settleSheet(state, 'full', 0, false);
    for (let frame = 0; frame < 6; frame += 1) stepSheet(state, FRAME_S);
    const caught = state.axis.value;
    expect(caught).toBeLessThan(DETENTS.half);
    expect(caught).toBeGreaterThan(DETENTS.full);
    grabSheet(state, HEIGHT);
    expect(stepSheet(state, FRAME_S)).toBe(false);
    expect(state.axis.value).toBe(caught);
    dragSheet(state, 10, HEIGHT);
    expect(state.axis.value).toBe(caught + 10);
  });

  it('keeps the shown position when a sheet caught past an end is grabbed', () => {
    const state = createSheetState(DETENTS, 'full');
    state.axis.value = DETENTS.full - 20;
    grabSheet(state, HEIGHT);
    dragSheet(state, 0, HEIGHT);
    expect(state.axis.value).toBeCloseTo(DETENTS.full - 20, 6);
  });

  it('bounces from exactly 300 px/s, in either direction', () => {
    expect(FLICK_MIN_PX_S).toBe(300);
    const damping = (vy: number): number => {
      const state = createSheetState(DETENTS, 'half');
      settleSheet(state, 'full', vy, false);
      return state.damping;
    };
    expect([damping(299), damping(-299)]).toEqual([1, 1]);
    expect([damping(300), damping(-300)]).toEqual([0.8, 0.8]);
  });

  it('jumps without a spring under reduced motion', () => {
    const state = createSheetState(DETENTS, 'half');
    settleSheet(state, 'full', -1500, true);
    expect(state.axis.value).toBe(DETENTS.full);
    expect(state.axis.velocity).toBe(0);
    expect(stepSheet(state, FRAME_S)).toBe(false);
  });
});

describe('SheetMotion', () => {
  const motionOn = (reduced: boolean) => {
    const state = createSheetState(DETENTS, 'half');
    const deps = { heightPx: () => HEIGHT, reducedMotion: () => reduced, invalidate: vi.fn(), onDetent: vi.fn() };
    return { state, deps, motion: new SheetMotion(state, deps) };
  };

  it('a drag up and a flick reach the picker detent, and say so', () => {
    const { state, deps, motion } = motionOn(false);
    motion.grab();
    motion.drag(-150);
    motion.release(-1200);
    expect(state.axis.velocity).toBe(-1200);
    expect(state.detent).toBe('full');
    expect(deps.onDetent).toHaveBeenCalledWith('full');
    expect(deps.invalidate).toHaveBeenCalled();
  });

  it('moves to a detent on request, recomputing the detents for a new viewport', () => {
    const { state, deps, motion } = motionOn(true);
    deps.heightPx = () => 700;
    motion.moveTo('peek');
    expect(state.axis.value).toBe(700 - 136);
  });
});

describe('sheet view', () => {
  it('cycles the detents from the grabber and names them', () => {
    expect([nextDetent('peek'), nextDetent('half'), nextDetent('full')]).toEqual(['half', 'full', 'peek']);
    expect(grabberLabel('half')).toBe('Sheet half height; press for full height');
  });

  it('measures how far open past half the sheet is', () => {
    expect(openness(DETENTS, DETENTS.half)).toBe(0);
    expect(openness(DETENTS, DETENTS.full)).toBe(1);
    expect(openness(DETENTS, DETENTS.peek)).toBe(0);
    expect(openness(DETENTS, (DETENTS.half + DETENTS.full) / 2)).toBeCloseTo(0.5);
  });
});
