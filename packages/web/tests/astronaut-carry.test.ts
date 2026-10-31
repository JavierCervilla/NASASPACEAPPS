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
import { createCarrier, type CarryEnd } from '../src/astronaut/carrier';
import { grabOffset, isTap, leanFor, nudged, TOUCH_LIFT_PX } from '../src/astronaut/carry-geometry';
import { createPlaces } from '../src/astronaut/places';
import { createSurfaces, type DropSurface } from '../src/astronaut/surfaces';
import { walkHome } from '../src/astronaut/walk-home';
import type { LatLon } from '../src/lib/polar-projection';
import { createSiteStore } from '../src/phone/site-store';

/** A frame clock the test steps by hand, 16 ms a frame. */
function manualFrames() {
  let queue: ((ms: number) => void)[] = [];
  let now = 0;
  return {
    frame: (fn: (ms: number) => void) => {
      queue.push(fn);
      return () => void (queue = queue.filter((f) => f !== fn));
    },
    run(frames = 200) {
      for (let i = 0; i < frames && queue.length; i++) {
        now += 16;
        const due = queue;
        queue = [];
        due.forEach((fn) => fn(now));
      }
    },
  };
}

/** A fake surface: the Moon is the disk of radius 100 px around 200, 200; a point is its px divided by 10. */
function fakeMoon(): DropSurface {
  const host = { isConnected: true, closest: () => null, contains: () => true } as unknown as HTMLElement;
  return {
    host,
    pointAt: (x, y) => (Math.hypot(x - 200, y - 200) > 100 ? null : { lat: -(y / 10), lonEast: x / 10 }),
    place: (p: LatLon) => ({ x: p.lonEast * 10, y: -p.lat * 10 }),
  };
}

function carrierOver(surface: DropSurface, reduced = false) {
  const surfaces = createSurfaces(() => ({}) as Element);
  surfaces.add(surface);
  const frames = manualFrames();
  const drop = vi.fn();
  const carrier = createCarrier({
    surfaces,
    stateAt: (p) => (p.lat < -20 ? 'window' : 'none'),
    drop,
    reducedMotion: () => reduced,
    frame: frames.frame,
  });
  const ends: (CarryEnd | null)[] = [];
  carrier.ended.subscribe(() => ends.push(carrier.ended.get()));
  return { carrier, frames, drop, ends };
}

const DOCK = { x: 20, y: 400 };

describe('carry geometry', () => {
  it('keeps the grab offset, and a finger below the feet', () => {
    expect(grabOffset({ x: 10, y: 10 }, { x: 14, y: 30 }, false)).toEqual({ x: 4, y: 20 });
    expect(grabOffset({ x: 10, y: 10 }, { x: 14, y: 30 }, true)).toEqual({ x: 4, y: -TOUCH_LIFT_PX });
  });

  it('leans with the speed, bounded, and never under reduced motion', () => {
    expect(leanFor(0, false)).toBe(0);
    expect(leanFor(10_000, false)).toBe(12);
    expect(leanFor(-450, false)).toBe(-6);
    expect(leanFor(10_000, true)).toBe(0);
  });

  it('moves the feet by arrow steps, bigger with Shift', () => {
    expect(nudged({ x: 0, y: 0 }, 'ArrowUp', false)).toEqual({ x: 0, y: -6 });
    expect(nudged({ x: 0, y: 0 }, 'ArrowRight', true)).toEqual({ x: 36, y: 0 });
    expect(nudged({ x: 0, y: 0 }, 'a', false)).toBeNull();
  });

  it('tells a tap from a drag', () => {
    expect(isTap({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
    expect(isTap({ x: 0, y: 0 }, { x: 9, y: 0 })).toBe(false);
  });
});

describe('a carry', () => {
  const start = { mode: 'pointer', pointer: DOCK, feet: DOCK, touch: false, t: 0 } as const;

  it('follows the pointer 1:1 and reads the point and state under the feet', () => {
    const { carrier } = carrierOver(fakeMoon());
    const session = carrier.lift(start);
    expect(carrier.view.get()).toMatchObject({ phase: 'carry', point: null, state: null });
    session?.move({ x: 250, y: 230 }, 16);
    expect(carrier.view.get()).toMatchObject({ feet: { x: 250, y: 230 }, point: { lat: -23, lonEast: 25 }, state: 'window' });
    expect(carrier.lift(start)).toBeNull();
  });

  it('drops on the Moon at the point under the feet', () => {
    const { carrier, drop, ends } = carrierOver(fakeMoon());
    const session = carrier.lift(start);
    session?.move({ x: 200, y: 200 }, 16);
    session?.release(32);
    expect(drop).toHaveBeenCalledWith({ lat: -20, lonEast: 20 });
    expect(carrier.view.get()).toBeNull();
    expect(ends).toEqual([{ kind: 'dropped', point: { lat: -20, lonEast: 20 } }]);
    expect(carrier.lift(start)).not.toBeNull();
  });

  it('let go off the Moon, walks home along a spring and ends there', () => {
    const { carrier, frames, drop, ends } = carrierOver(fakeMoon());
    const session = carrier.lift(start);
    session?.move({ x: 600, y: 100 }, 500);
    session?.release(700);
    expect(carrier.view.get()).toMatchObject({ phase: 'return' });
    frames.run(1);
    const first = carrier.view.get()?.feet;
    expect(first?.x).toBeLessThan(600);
    expect(first?.x).toBeGreaterThan(DOCK.x);
    frames.run();
    expect(carrier.view.get()).toBeNull();
    expect(drop).not.toHaveBeenCalled();
    expect(ends).toEqual([{ kind: 'back', cancelled: false }]);
  });

  it('cancelled (Esc), walks back to where it was lifted', () => {
    const { carrier, frames, ends } = carrierOver(fakeMoon());
    const session = carrier.lift({ ...start, mode: 'keys', home: { x: 5, y: 5 } });
    session?.move({ x: 200, y: 200 }, 16);
    session?.cancel();
    const seen: number[] = [];
    carrier.view.subscribe(() => seen.push(carrier.view.get()?.feet.x ?? -1));
    frames.run();
    expect(seen.at(-2)).toBeCloseTo(5, 0);
    expect(ends).toEqual([{ kind: 'back', cancelled: true }]);
  });

  it('under reduced motion fades where it is instead of travelling', () => {
    const { carrier, frames, ends } = carrierOver(fakeMoon(), true);
    const session = carrier.lift(start);
    session?.move({ x: 600, y: 100 }, 16);
    session?.release(32);
    const seen: number[] = [];
    carrier.view.subscribe(() => seen.push(carrier.view.get()?.feet.x ?? -1));
    frames.run();
    expect(seen).toEqual([-1]);
    expect(ends).toEqual([{ kind: 'back', cancelled: false }]);
  });

  it('moves by arrow keys, and Enter drops it', () => {
    const { carrier, drop } = carrierOver(fakeMoon());
    const session = carrier.lift({ ...start, mode: 'keys', pointer: { x: 200, y: 200 }, feet: { x: 200, y: 200 } });
    expect(session?.nudge('ArrowRight', true)).toBe(true);
    expect(session?.nudge('x', false)).toBe(false);
    session?.release(0);
    expect(drop).toHaveBeenCalledWith({ lat: -20, lonEast: 23.6 });
  });
});

describe('walk home', () => {
  it('starts at the hand’s velocity', () => {
    const frames = manualFrames();
    const steps: number[] = [];
    const deps = { frame: frames.frame, reducedMotion: false, onStep: (p: { x: number }) => steps.push(p.x), onHome: vi.fn() };
    walkHome({ x: 100, y: 0 }, { x: 0, y: 0 }, { x: 3000, y: 0 }, deps);
    frames.run(1);
    expect(steps[0]).toBeGreaterThan(100);
    frames.run();
    expect(steps.at(-1)).toBe(0);
    expect(deps.onHome).toHaveBeenCalledOnce();
  });
});

describe('surfaces', () => {
  it('answer only for the shown surface whose element is under the point', () => {
    const inside = { id: 'in' } as unknown as Element;
    const moon = fakeMoon();
    const host = { isConnected: true, closest: () => null, contains: (el: unknown) => el === inside } as unknown as HTMLElement;
    let hit: Element | null = inside;
    const surfaces = createSurfaces(() => hit);
    const remove = surfaces.add({ ...moon, host });
    expect(surfaces.at({ x: 200, y: 200 })?.point).toEqual({ lat: -20, lonEast: 20 });
    hit = { id: 'key' } as unknown as Element;
    expect(surfaces.at({ x: 200, y: 200 })).toBeNull();
    remove();
    hit = inside;
    expect(surfaces.at({ x: 200, y: 200 })).toBeNull();
    expect(surfaces.shown()).toBeNull();
  });
});

describe('places', () => {
  function placesAt(search: string) {
    const store = createSiteStore('im2-athena');
    const address = { value: search, search: () => address.value, replace: (s: string) => void (address.value = s) };
    return { store, address, places: createPlaces(store, address) };
  }

  it('stands the astronaut on a dropped point, selects it and writes it into the address', () => {
    const { store, address, places } = placesAt('?site=apollo11');
    places.drop({ lat: -85.87, lonEast: 61.3 });
    expect(places.place.get()).toEqual({ kind: 'moon', point: { lat: -85.87, lonEast: 61.3 } });
    expect(store.get()).toEqual({ id: '@-85.87,61.30', origin: 'globe' });
    expect(address.value).toBe('?site=apollo11&lat=-85.87&lon=61.30');
  });

  it('brings it home to the listed site chosen before', () => {
    const { store, address, places } = placesAt('');
    store.select('apollo11', 'list');
    places.drop({ lat: -85, lonEast: 1 });
    places.drop({ lat: -86, lonEast: 2 });
    places.bringHome();
    expect(places.place.get()).toEqual({ kind: 'home' });
    expect(store.get()).toEqual({ id: 'apollo11', origin: 'list' });
    expect(address.value).toBe('');
  });

  it('opens the address: ?site= as the site to go back to, ?lat&lon as the point', () => {
    const { store, places } = placesAt('?site=apollo11&lat=-89.5&lon=0');
    places.restore(['im2-athena', 'apollo11']);
    expect(store.get().id).toBe('@-89.50,0.00');
    places.bringHome();
    expect(store.get().id).toBe('apollo11');
  });

  it('takes the point out of the address when a listed site is picked, and keeps ?site= on it', () => {
    const { store, address, places } = placesAt('?site=apollo11');
    places.drop({ lat: -62.03, lonEast: 30 });
    expect(address.value).toBe('?site=apollo11&lat=-62.03&lon=30.00');
    store.select('im2-athena', 'list');
    expect(address.value).toBe('?site=im2-athena');
    places.drop({ lat: -62.03, lonEast: 30 });
    store.select('apollo11', 'list');
    expect(address.value).toBe('?site=apollo11');
  });

  it('writes no ?site= of its own when the address had none', () => {
    const { store, address, places } = placesAt('');
    places.drop({ lat: -62.03, lonEast: 30 });
    store.select('apollo11', 'list');
    expect(address.value).toBe('');
  });

  it('keeps the point it opens in the address', () => {
    const { store, address, places } = placesAt('?site=apollo11&lat=-89.5&lon=0');
    places.restore(['im2-athena', 'apollo11']);
    expect(store.get().id).toBe('@-89.50,0.00');
    expect(address.value).toBe('?site=apollo11&lat=-89.50&lon=0.00');
  });
});
