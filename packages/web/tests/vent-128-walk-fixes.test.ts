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
 * The walk's fixes after VENT-121's review (VENT-128): the hover's pace, the chip at a site in permanent shadow, a
 * press that stops a coast, the chip against the caption, the stones' material on every arrival, and the edge card
 * going as the eye starts back.
 */
import { describe, expect, it, vi } from 'vitest';
import { Group, Mesh, MeshBasicMaterial, Scene, type Material } from 'three';
import { createHover } from '../src/terrain/scene/walk-hover';
import { eyeState } from '../src/terrain/walk/eye-state';
import { walkView } from '../src/terrain/walk/walk-view';
import { chipCovers } from '../src/terrain/walk/chip-clear';
import { bindLook } from '../src/terrain/scene/controls';
import { dragScale } from '../src/terrain/look-input';
import { goTo, type WalkParts } from '../src/terrain/scene/walk-move';
import { edgeShown } from '../src/terrain/scene/walk-edge';
import { rebuildNear, type World } from '../src/terrain/scene/world';
import type { SceneInput } from '../src/terrain/scene/scene-types';
import type { ViewState } from '../src/terrain/scene/scene-frame';
import { createSunMask } from '../src/terrain/scene/sun-mask';
import type { Slicer } from '../src/terrain/scene/slicer';
import { MEASURED } from '../src/terrain/rock-law';
import { EN } from './i18n-factories';

vi.mock('../src/terrain/scene/rock-ground', () => ({
  rockGrounds: () => ({ scatter: () => 0, stand: () => 0 }),
}));

/** A display whose frames the test runs by hand. */
function display() {
  const queued = new Map<number, () => void>();
  let ids = 0;
  return {
    raf: (fn: () => void) => (queued.set(++ids, fn), ids),
    cancel: (id: number) => void queued.delete(id),
    frame: () => {
      const run = [...queued.values()];
      queued.clear();
      for (const fn of run) fn();
    },
    waiting: () => queued.size,
  };
}

describe('the hover ring’s pace', () => {
  function rig(ground: (x: number) => [number, number] | null) {
    const screen = display();
    const log = { picks: 0, shown: [] as (readonly [number, number] | null)[] };
    let pose = 'a';
    const hover = createHover({ raf: screen.raf, cancel: screen.cancel, pose: () => pose,
      pick: (x) => (log.picks++, ground(x)), show: (at) => void log.shown.push(at) });
    return { screen, log, hover, turn: (to: string) => void (pose = to) };
  }

  it('picks once a display frame, the latest pointer, however many moves came', () => {
    const { screen, log, hover } = rig((x) => [x, 0]);
    for (let i = 0; i < 60; i++) hover.hover({ x: i, y: 10 });
    expect(log.picks).toBe(0);
    screen.frame();
    expect(log).toEqual({ picks: 1, shown: [[59, 0]] });
  });

  it('neither picks nor draws for a pointer that stayed within a fifth of a pixel, until the camera moves', () => {
    const { screen, log, hover, turn } = rig((x) => [x, 0]);
    hover.hover({ x: 10, y: 10 });
    screen.frame();
    hover.hover({ x: 10.15, y: 10.1 });
    screen.frame();
    expect(log.picks).toBe(1);
    turn('b');
    hover.hover({ x: 10.15, y: 10.1 });
    screen.frame();
    expect(log.picks).toBe(2);
  });

  it('asks for no frame while the pointer stays over the sky', () => {
    const { screen, log, hover } = rig(() => null);
    hover.hover({ x: 1, y: 1 });
    screen.frame();
    hover.hover({ x: 40, y: 1 });
    screen.frame();
    hover.hover(null);
    screen.frame();
    expect(log.picks).toBe(2);
    expect(log.shown).toEqual([]);
  });

  it('hides the ring once when the pointer leaves, and drops a pick still waiting when disposed', () => {
    const { screen, log, hover } = rig((x) => [x, 0]);
    hover.hover({ x: 5, y: 5 });
    screen.frame();
    hover.hover(null);
    screen.frame();
    expect(log.shown).toEqual([[5, 0], null]);
    hover.hover({ x: 9, y: 5 });
    hover.dispose();
    expect(screen.waiting()).toBe(0);
  });
});

describe('the chip at a site in permanent shadow', () => {
  const sky = { sunAz: 0, sunEl: 2, earthAz: 90, earthEl: 6 };
  const sight = { sunClear: true, earthClear: true };

  it('never has the Sun, as the pill', () => {
    expect(eyeState({ sunEl: 2, earthEl: 5, sunClear: true, earthClear: true, sunHidden: true })).toBe('earth');
    expect(eyeState({ sunEl: 2, earthEl: -1, sunClear: true, earthClear: false, sunHidden: true })).toBe('none');
  });

  it('says «Earth here» where the eye sees both, and the live region says the same', () => {
    const view = walkView(EN, { at: [130, 130], edge: false, sight }, { ...sky, sunHidden: true }, 'Shackleton');
    expect(view).toMatchObject({ state: 'earth', here: 'Earth here', said: '180 m NE of Shackleton · Earth here' });
  });
});

describe('a press that stops a coast', () => {
  const pointer = (type: string, x: number) => {
    const e = new Event(type);
    for (const [k, v] of Object.entries({ button: 0, pointerId: 1, clientX: x, clientY: 0, timeStamp: 0, pointerType: 'mouse' })) {
      Object.defineProperty(e, k, { value: v });
    }
    return e;
  };

  function rig(coasting: boolean) {
    const el = Object.assign(new EventTarget(), { setPointerCapture: () => undefined }) as unknown as HTMLElement;
    const log: string[] = [];
    bindLook(el, { look: () => ({ yawDeg: 0, pitchDeg: 0 }), goHome: () => undefined, set: () => log.push('set'),
      scale: () => dragScale(400, 800, 50), fling: () => log.push('fling'),
      halt: () => (log.push('halt'), coasting), drag: () => undefined,
      walker: { tap: () => log.push('tap'), hover: () => undefined } });
    return { el, log };
  }

  it('only stops the view: it neither walks nor flings', () => {
    const { el, log } = rig(true);
    el.dispatchEvent(pointer('pointerdown', 100));
    el.dispatchEvent(pointer('pointerup', 100));
    expect(log).toEqual(['halt']);
  });

  it('walks on a still view, as before', () => {
    const { el, log } = rig(false);
    el.dispatchEvent(pointer('pointerdown', 100));
    el.dispatchEvent(pointer('pointerup', 100));
    expect(log).toEqual(['halt', 'tap']);
  });

  it('still turns when it travels on', () => {
    const { el, log } = rig(true);
    el.dispatchEvent(pointer('pointerdown', 100));
    el.dispatchEvent(pointer('pointermove', 120));
    el.dispatchEvent(pointer('pointerup', 120));
    expect(log).toEqual(['halt', 'set', 'fling']);
  });
});

describe('the chip against the caption', () => {
  const box = (top: number, bottom: number, left = 12, right = 300) => ({ top, bottom, left, right });
  const clip = box(100, 500, 0, 390);

  it('covers it where the boxes meet within the caption’s clip', () => {
    expect(chipCovers(box(100, 200), box(180, 300), clip)).toBe(true);
    // The caption overflows its clip at the top: only its visible part counts.
    expect(chipCovers(box(100, 150), box(40, 300), clip)).toBe(true);
    expect(chipCovers(box(20, 90), box(40, 300), clip)).toBe(false);
  });

  it('leaves it where they only touch or sit side by side', () => {
    expect(chipCovers(box(100, 180), box(180, 300), clip)).toBe(false);
    expect(chipCovers(box(100, 200, 12, 150), box(150, 300, 160, 380), clip)).toBe(false);
  });
});

describe('the stones on every arrival', () => {
  const recording = (): Slicer & { run: () => void } => {
    const jobs: (() => void)[] = [];
    return { add: (_k, _p, run) => void jobs.push(run), clear: () => void (jobs.length = 0),
      busy: () => jobs.length > 0, run: () => jobs.splice(0).forEach((job) => job()) };
  };

  it('frees the materials of the ground it leaves: ten walks keep the same count live', () => {
    const slicer = recording();
    const scene = new Scene();
    const shared = new MeshBasicMaterial();
    const world = { stage: { scene }, near: new Group(), ground: () => 0, policy: { rocksCap: 40, rockLaw: MEASURED },
      craters: null, mask: createSunMask(), slicer, eye: [0, 0], scans: null,
      setup: { quality: { tier: 'low' }, report: { step: () => undefined } } } as unknown as World;
    const input = { ring: {}, seed: 7 } as unknown as SceneInput;
    const live = new Set<Material>();
    const track = () => world.near.traverse((o) => {
      const { material } = o as Partial<Mesh>;
      for (const m of [material ?? []].flat()) {
        if (live.has(m)) continue;
        live.add(m);
        m.addEventListener('dispose', () => live.delete(m));
      }
    });
    for (let i = 0; i < 11; i++) {
      world.eye = [i * 100, 0];
      rebuildNear(world, input);
      slicer.run();
      // A scanned rock under the stones wears the view's material: it is never freed with the ground.
      world.near.children[1]?.add(new Mesh(undefined, shared));
      track();
    }
    expect(live.size).toBe(3);
    expect(live.has(shared)).toBe(true);
  });
});

describe('the edge card on the way back', () => {
  it('goes as soon as the glide starts, and the panel hears it then', () => {
    const tell = vi.fn();
    const view = { eye: [0, 1500], glide: null, edge: true, fading: false } as unknown as ViewState;
    const world = { invalidate: () => undefined, tellEye: () => tell(edgeShown(view)) } as unknown as World;
    const parts = { world, view, host: {} as HTMLElement, reducedMotion: () => false } as WalkParts;
    expect(edgeShown(view)).toBe(true);
    goTo(parts, [0, 0]);
    expect(edgeShown(view)).toBe(false);
    expect(tell).toHaveBeenCalledWith(false);
  });

  it('stays down while the eye glides to another place past the reach', () => {
    const view = { eye: [0, 1500], glide: null, edge: true, fading: false } as unknown as ViewState;
    const world = { invalidate: () => undefined, tellEye: () => undefined } as unknown as World;
    goTo({ world, view, host: {} as HTMLElement, reducedMotion: () => false } as WalkParts, [3000, 0]);
    expect(view.edge).toBe(true);
    expect(edgeShown(view)).toBe(false);
  });
});
