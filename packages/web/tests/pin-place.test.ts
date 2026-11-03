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

// Placing the pin (VENT-37): a click or a held finger on the Moon, the hold's carry, a drop without a carry, the
// «Drop a pin» button's drop, and the first-time hint. The web package has no DOM test environment: the surface's
// host is a plain EventTarget and the pointer events are Events with the fields the gesture reads.
import { describe, expect, it, vi } from 'vitest';
import { createCarrier, type CarryEnd } from '../src/pin/carrier';
import { TOUCH_LIFT_PX } from '../src/pin/carry-geometry';
import { createPinHint, HINT_KEY, type HintStorage } from '../src/pin/first-hint';
import { dropAtStart } from '../src/pin/key-carry';
import { bindPlacing, HOLD_LATE_MS, HOLD_MS, PRESS_SLOP_PX } from '../src/pin/place-gesture';
import { createSurfaces, type DropSurface } from '../src/pin/surfaces';
import type { LatLon } from '../src/lib/polar-projection';

/** The Moon is the disk of radius 100 px around 200, 200; a point is its px divided by 10. */
function fakeMoon(): DropSurface {
  const host = new EventTarget() as unknown as HTMLElement;
  Object.assign(host, {
    isConnected: true,
    closest: () => null,
    contains: () => true,
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 200, height: 200 }),
  });
  return {
    host,
    pointAt: (x, y) => (Math.hypot(x - 200, y - 200) > 100 ? null : { lat: -(y / 10), lonEast: x / 10 }),
    place: (p: LatLon) => ({ x: p.lonEast * 10, y: -p.lat * 10 }),
  };
}

/** A timer the test fires by hand, `late` ms after it was due, on a clock it moves. */
function manualTimer() {
  let due: (() => void) | null = null;
  let dueAt = 0;
  let clock = 0;
  return {
    after: (fn: () => void, ms: number) => {
      due = fn;
      dueAt = clock + ms;
      return () => void (due = null);
    },
    now: () => clock,
    fire: (late = 0) => {
      clock = dueAt + late;
      due?.();
    },
    pending: () => due !== null,
  };
}

function setUp() {
  const moon = fakeMoon();
  const surfaces = createSurfaces(() => ({}) as Element);
  surfaces.add(moon);
  const drop = vi.fn();
  const frame = () => () => undefined;
  const stateAt = () => 'window' as const;
  const carrier = createCarrier({ surfaces, stateAt, drop, reducedMotion: () => false, frame });
  const ends: (CarryEnd | null)[] = [];
  carrier.ended.subscribe(() => ends.push(carrier.ended.get()));
  const timer = manualTimer();
  const keys = new EventTarget();
  const unbind = bindPlacing(moon.host, { carrier, surfaces, after: timer.after, now: timer.now, keys });
  return { moon, surfaces, carrier, drop, ends, timer, keys, unbind };
}

interface PressFields {
  readonly x: number;
  readonly y: number;
  readonly type?: 'mouse' | 'touch';
  readonly id?: number;
  readonly target?: unknown;
}

/** A pointer event of `kind` at `x`, `y`, cancelable like the browser's. */
function pointer(kind: string, fields: PressFields): Event {
  const event = new Event(kind, { cancelable: true });
  // The pressed element; the host itself when not given.
  if (fields.target) Object.defineProperty(event, 'target', { value: fields.target });
  return Object.assign(event, {
    clientX: fields.x,
    clientY: fields.y,
    pointerType: fields.type ?? 'mouse',
    pointerId: fields.id ?? 1,
    isPrimary: (fields.id ?? 1) === 1,
    button: 0,
  });
}

const send = (host: EventTarget, kind: string, fields: PressFields): Event => {
  const event = pointer(kind, fields);
  host.dispatchEvent(event);
  return event;
};

describe('a click on the Moon', () => {
  it('drops the pin on the point under it, on the grid', () => {
    const { moon, drop, ends } = setUp();
    send(moon.host, 'pointerdown', { x: 213.37, y: 200 });
    send(moon.host, 'pointerup', { x: 213.37, y: 200 });
    expect(drop).toHaveBeenCalledWith({ lat: -20, lonEast: 21.34 });
    expect(ends).toEqual([{ kind: 'dropped', point: { lat: -20, lonEast: 21.34 } }]);
  });

  it('that travelled turned the globe: no pin', () => {
    const { moon, drop } = setUp();
    send(moon.host, 'pointerdown', { x: 200, y: 200 });
    send(moon.host, 'pointermove', { x: 200 + PRESS_SLOP_PX + 1, y: 200 });
    send(moon.host, 'pointerup', { x: 200, y: 200 });
    expect(drop).not.toHaveBeenCalled();
  });

  it('on a site marker or a button is theirs, and off the Moon drops nothing', () => {
    const { moon, drop } = setUp();
    const marker = { closest: () => ({}) };
    send(moon.host, 'pointerdown', { x: 200, y: 200, target: marker });
    send(moon.host, 'pointerup', { x: 200, y: 200, target: marker });
    send(moon.host, 'pointerdown', { x: 20, y: 20 });
    send(moon.host, 'pointerup', { x: 20, y: 20 });
    expect(drop).not.toHaveBeenCalled();
  });

  it('is unbound with the surface', () => {
    const { moon, drop, unbind } = setUp();
    unbind();
    send(moon.host, 'pointerdown', { x: 200, y: 200 });
    send(moon.host, 'pointerup', { x: 200, y: 200 });
    expect(drop).not.toHaveBeenCalled();
  });
});

describe('a finger on the Moon', () => {
  const touch = (x: number, y: number, id = 1) => ({ x, y, id, type: 'touch' as const });

  it('a short tap drops nothing: a tap or a drag turns the globe', () => {
    const { moon, drop, timer } = setUp();
    send(moon.host, 'pointerdown', touch(200, 200));
    expect(timer.pending()).toBe(true);
    send(moon.host, 'pointerup', touch(200, 200));
    expect(timer.pending()).toBe(false);
    expect(drop).not.toHaveBeenCalled();
  });

  it(`held ${HOLD_MS} ms lifts the pin under it, and let go in place drops the point pressed`, () => {
    const { moon, carrier, drop, timer } = setUp();
    send(moon.host, 'pointerdown', touch(220, 200));
    timer.fire();
    expect(carrier.view.get()).toMatchObject({ mode: 'hold', at: { x: 220, y: 200 }, point: { lat: -20, lonEast: 22 } });
    const up = send(moon.host, 'pointerup', touch(221, 200));
    expect(up.defaultPrevented).toBe(true);
    expect(drop).toHaveBeenCalledWith({ lat: -20, lonEast: 22.1 });
  });

  it('held, then moved, carries the pin above the fingertip, and the globe hears none of it', () => {
    const { moon, carrier, drop, timer } = setUp();
    send(moon.host, 'pointerdown', touch(200, 240));
    timer.fire();
    const move = send(moon.host, 'pointermove', touch(200, 260));
    expect(move.defaultPrevented).toBe(true);
    expect(carrier.view.get()?.at).toEqual({ x: 200, y: 260 - TOUCH_LIFT_PX });
    send(moon.host, 'pointerup', touch(200, 260));
    expect(drop).toHaveBeenCalledWith({ lat: -(260 - TOUCH_LIFT_PX) / 10, lonEast: 20 });
  });

  it('that travels before the hold, or meets a second finger, is the globe’s', () => {
    const { moon, carrier, timer } = setUp();
    send(moon.host, 'pointerdown', touch(200, 200));
    send(moon.host, 'pointermove', touch(200, 200 + PRESS_SLOP_PX + 1));
    expect(timer.pending()).toBe(false);
    send(moon.host, 'pointerup', touch(200, 205));
    send(moon.host, 'pointerdown', touch(200, 200));
    send(moon.host, 'pointerdown', touch(260, 200, 2));
    expect(timer.pending()).toBe(false);
    expect(carrier.current()).toBeNull();
  });

  it('a second finger after the hold cancels the pin, and the menu is refused while a finger is down', () => {
    const { moon, carrier, drop, timer, ends } = setUp();
    send(moon.host, 'pointerdown', touch(200, 200));
    const menu = new Event('contextmenu', { cancelable: true });
    moon.host.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    timer.fire();
    expect(carrier.current()).not.toBeNull();
    send(moon.host, 'pointerdown', touch(260, 200, 2));
    expect(carrier.view.get()).toMatchObject({ phase: 'return' });
    expect(drop).not.toHaveBeenCalled();
    expect(ends).toEqual([]);
  });

  // A busy main thread fires the hold's timer late, while a drag the browser queued is not delivered yet: the
  // late timer must not read the finger as still (VENT-52).
  it(`whose hold fires over ${HOLD_LATE_MS} ms late waits again: a queued drag turns the globe, no pin`, () => {
    const { moon, carrier, timer } = setUp();
    send(moon.host, 'pointerdown', touch(200, 200));
    timer.fire(HOLD_LATE_MS + 1);
    expect(carrier.current()).toBeNull();
    expect(timer.pending()).toBe(true);
    send(moon.host, 'pointermove', touch(200, 200 + PRESS_SLOP_PX + 1));
    expect(timer.pending()).toBe(false);
    expect(carrier.current()).toBeNull();
  });

  it('whose late hold waits again lifts the pin once the page saw the finger still the whole hold', () => {
    const { moon, carrier, timer } = setUp();
    send(moon.host, 'pointerdown', touch(220, 200));
    timer.fire(HOLD_LATE_MS + 300);
    expect(carrier.current()).toBeNull();
    timer.fire();
    expect(carrier.view.get()).toMatchObject({ mode: 'hold', at: { x: 220, y: 200 } });
  });

  it(`whose hold fires up to ${HOLD_LATE_MS} ms late still lifts the pin`, () => {
    const { moon, carrier, timer } = setUp();
    send(moon.host, 'pointerdown', touch(220, 200));
    timer.fire(HOLD_LATE_MS);
    expect(carrier.current()).not.toBeNull();
  });

  it('held off the Moon lifts nothing', () => {
    const { moon, carrier, timer } = setUp();
    send(moon.host, 'pointerdown', touch(20, 20));
    timer.fire();
    expect(carrier.current()).toBeNull();
  });
});

describe('a drop without a carry', () => {
  it('drops the point snapped, ends as a drop, and waits while a carry is under way', () => {
    const { carrier, drop, ends } = setUp();
    carrier.place({ lat: -85.874, lonEast: 61.339 });
    expect(drop).toHaveBeenCalledWith({ lat: -85.87, lonEast: 61.34 });
    expect(ends).toEqual([{ kind: 'dropped', point: { lat: -85.87, lonEast: 61.34 } }]);
    carrier.lift({ mode: 'keys', pointer: { x: 0, y: 0 }, at: { x: 0, y: 0 }, touch: false, t: 0 });
    carrier.place({ lat: -80, lonEast: 1 });
    expect(drop).toHaveBeenCalledTimes(1);
  });

  it('«Drop a pin» drops on the selected site, or on the Moon mid view', () => {
    const { carrier, surfaces, drop } = setUp();
    const say = vi.fn();
    dropAtStart({ carrier, surfaces, say, startPoint: () => ({ lat: -84.79, lonEast: 29.2 }) });
    expect(drop).toHaveBeenLastCalledWith({ lat: -84.79, lonEast: 29.2 });
    dropAtStart({ carrier, surfaces, say, startPoint: () => null });
    expect(drop).toHaveBeenLastCalledWith({ lat: -20, lonEast: 20 });
  });
});

describe('the first-time hint', () => {
  function memory(): HintStorage & { kept: Map<string, string> } {
    const kept = new Map<string, string>();
    return { kept, getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => void kept.set(k, v) };
  }

  it('shows until dismissed, and never again on this device', () => {
    const storage = memory();
    const { carrier } = setUp();
    const hint = createPinHint(storage, carrier);
    expect(hint.shown.get()).toBe(true);
    hint.dismiss();
    expect(hint.shown.get()).toBe(false);
    expect(storage.kept.get(HINT_KEY)).toBe('seen');
    expect(createPinHint(storage, carrier).shown.get()).toBe(false);
  });

  it('goes with the first pin dropped, not with a carry that sprang back', () => {
    const storage = memory();
    const { carrier } = setUp();
    const hint = createPinHint(storage, carrier);
    carrier.ended.set({ kind: 'back', cancelled: true });
    expect(hint.shown.get()).toBe(true);
    carrier.place({ lat: -85, lonEast: 1 });
    expect(hint.shown.get()).toBe(false);
  });

  it('survives storage that refuses access: it shows, and its dismissal holds for the visit', () => {
    const refusing: HintStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    const { carrier } = setUp();
    const hint = createPinHint(refusing, carrier);
    expect(hint.shown.get()).toBe(true);
    hint.dismiss();
    expect(hint.shown.get()).toBe(false);
  });
});
