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

// The globe stays still under a held pin (VENT-37): once a finger held on the Moon has lifted the pin, its moves are
// marked handled (pin/place-gesture.ts, capture phase) and the globe's drag and pinch skip them. Without that check the
// globe turns under the carried pin and the point under it slides away. Same fake host as pin-place.test.ts: the web
// package has no DOM test environment, so the host is a plain EventTarget and the pointer events carry the fields the
// gestures read; the placing listeners are bound first, as the capture phase runs them first in the browser.
import { describe, expect, it, vi } from 'vitest';
import { bindDrag } from '../src/globe/drag';
import { bindPinch } from '../src/globe/pinch';
import { pastSlop, PRESS_SLOP_PX } from '../src/lib/press-slop';
import { createCarrier } from '../src/pin/carrier';
import { bindPlacing } from '../src/pin/place-gesture';
import { createSurfaces } from '../src/pin/surfaces';

/** The Moon is the disk of radius 100 px around 200, 200. */
function moonHost(): HTMLElement {
  const host = new EventTarget() as unknown as HTMLElement;
  Object.assign(host, {
    isConnected: true,
    closest: () => null,
    contains: () => true,
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 200, height: 200 }),
    setPointerCapture: () => undefined,
  });
  return host;
}

/**
 * A globe whose drag and pinch are spies, with the pin placed from the same host; `hold` fires the finger's hold.
 * `coasting`: the globe still turns from a flick, so a press stops it (DragTarget.press).
 */
function setUp(coasting = false) {
  const host = moonHost();
  const surfaces = createSurfaces(() => ({}) as Element);
  surfaces.add({
    host,
    pointAt: (x, y) => (Math.hypot(x - 200, y - 200) > 100 ? null : { lat: -(y / 10), lonEast: x / 10 }),
    place: (p) => ({ x: p.lonEast * 10, y: -p.lat * 10 }),
  });
  const drop = vi.fn();
  const carrier = createCarrier({
    surfaces,
    stateAt: () => 'window' as const,
    drop,
    reducedMotion: () => false,
    frame: () => () => undefined,
  });
  let hold: (() => void) | null = null;
  const after = (fn: () => void) => {
    hold = fn;
    return () => void (hold = null);
  };
  bindPlacing(host, { carrier, surfaces, after, keys: new EventTarget() });
  const turn = { drag: vi.fn(), release: vi.fn(), press: vi.fn(() => coasting) };
  const zoom = vi.fn();
  bindDrag(host, turn);
  bindPinch(host, zoom);
  return { host, carrier, turn, zoom, drop, hold: () => hold?.() };
}

/** A touch pointer event of `kind` at `x`, `y`, cancelable like the browser's. */
function touch(host: EventTarget, kind: string, at: { x: number; y: number; id?: number }, type = 'touch'): Event {
  const event = Object.assign(new Event(kind, { cancelable: true }), {
    clientX: at.x,
    clientY: at.y,
    pointerType: type,
    pointerId: at.id ?? 1,
    isPrimary: (at.id ?? 1) === 1,
    button: 0,
  });
  host.dispatchEvent(event);
  return event;
}

describe('a finger that holds the pin', () => {
  it('drags the pin, and the globe under it does not turn', () => {
    const { host, carrier, turn, hold } = setUp();
    touch(host, 'pointerdown', { x: 200, y: 240 });
    hold();
    expect(carrier.current()).not.toBeNull();
    for (let y = 250; y <= 290; y += 10) touch(host, 'pointermove', { x: 200, y });
    touch(host, 'pointerup', { x: 200, y: 290 });
    expect(turn.drag).not.toHaveBeenCalled();
    expect(turn.release).not.toHaveBeenCalled();
  });

  it('before the hold, a finger that travels still turns the globe', () => {
    const { host, carrier, turn } = setUp();
    touch(host, 'pointerdown', { x: 200, y: 240 });
    for (let y = 250; y <= 290; y += 10) touch(host, 'pointermove', { x: 200, y });
    expect(carrier.current()).toBeNull();
    expect(turn.drag).toHaveBeenCalled();
  });
});

/** A mouse pointer event of `kind` at `x`, `y`. */
const mouse = (host: EventTarget, kind: string, at: { x: number; y: number }) => touch(host, kind, at, 'mouse');

describe('one threshold for a click and a turn', () => {
  it(`a press that travels exactly ${PRESS_SLOP_PX} px turns the globe and drops no pin`, () => {
    const { host, turn, drop } = setUp();
    mouse(host, 'pointerdown', { x: 200, y: 200 });
    mouse(host, 'pointermove', { x: 200 + PRESS_SLOP_PX, y: 200 });
    mouse(host, 'pointerup', { x: 200 + PRESS_SLOP_PX, y: 200 });
    expect(turn.drag).toHaveBeenCalledOnce();
    expect(drop).not.toHaveBeenCalled();
  });

  it('a press that travels less is a click: the pin drops, the globe does not turn', () => {
    const { host, turn, drop } = setUp();
    mouse(host, 'pointerdown', { x: 200, y: 200 });
    mouse(host, 'pointermove', { x: 200 + PRESS_SLOP_PX - 0.5, y: 200 });
    mouse(host, 'pointerup', { x: 200 + PRESS_SLOP_PX - 0.5, y: 200 });
    expect(turn.drag).not.toHaveBeenCalled();
    expect(drop).toHaveBeenCalledOnce();
  });

  it('a click is a drag by the same comparison the globe uses', () => {
    expect(pastSlop({ x: 0, y: 0 }, { x: PRESS_SLOP_PX, y: 0 })).toBe(true);
    expect(pastSlop({ x: 0, y: 0 }, { x: 3, y: 2.6 })).toBe(false);
    expect(pastSlop({ x: 0, y: 0 }, { x: 3, y: 2.7 })).toBe(true);
  });
});

describe('a press on a globe still turning from a flick', () => {
  it('stops it, like Maps, and that click drops no pin', () => {
    const { host, turn, drop } = setUp(true);
    mouse(host, 'pointerdown', { x: 200, y: 200 });
    mouse(host, 'pointerup', { x: 200, y: 200 });
    expect(turn.press).toHaveBeenCalledOnce();
    expect(drop).not.toHaveBeenCalled();
  });

  it('nor does a finger held there lift one', () => {
    const { host, carrier, hold } = setUp(true);
    touch(host, 'pointerdown', { x: 200, y: 240 });
    hold();
    expect(carrier.current()).toBeNull();
  });

  it('on a globe at rest the click drops the pin', () => {
    const { host, turn, drop } = setUp(false);
    mouse(host, 'pointerdown', { x: 200, y: 200 });
    mouse(host, 'pointerup', { x: 200, y: 200 });
    expect(turn.press).toHaveBeenCalledOnce();
    expect(drop).toHaveBeenCalledOnce();
  });
});

describe('the pinch', () => {
  it('does not zoom on moves a held pin already handled', () => {
    const { host, zoom } = setUp();
    touch(host, 'pointerdown', { x: 180, y: 200, id: 1 });
    touch(host, 'pointerdown', { x: 220, y: 200, id: 2 });
    const handled = Object.assign(new Event('pointermove', { cancelable: true }), {
      clientX: 240,
      clientY: 200,
      pointerType: 'touch',
      pointerId: 2,
    });
    handled.preventDefault();
    host.dispatchEvent(handled);
    expect(zoom).not.toHaveBeenCalled();
    touch(host, 'pointermove', { x: 260, y: 200, id: 2 });
    expect(zoom).toHaveBeenCalledOnce();
  });
});
