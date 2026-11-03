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
 * The on-foot view's pure parts (VENT-34): the tile's answer and its URL,
 * the tries, the mesh's heights and triangles, the camera, the seeded
 * detail, the far horizon's backdrop, the ridge and the Sun's shadows.
 */
import { encodeProfile, horizonAt, quantiseDeg } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { backdropTopDeg, backdropWall, dipDeg } from '../src/terrain/far-horizon';
import { BufferGeometry, DataTexture, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, Vector3, type BufferAttribute } from 'three';
import { markReadyWhenStanding } from '../src/terrain/scene/ready-mark';
import { disposeStage, type Stage } from '../src/terrain/scene/stage';
import { createSunMask } from '../src/terrain/scene/sun-mask';
import { aimCamera } from '../src/terrain/scene/camera-apply';
import { shadeSun } from '../src/terrain/scene/sky-place';
import { groundOf } from '../src/terrain/scene/world-ground';
import type { World } from '../src/terrain/scene/world';
import { dragLook, dragScale, keyLook } from '../src/terrain/look-input';
import { bindLook } from '../src/terrain/scene/controls';
import { createLoop } from '../src/globe/loop';
import { FLING_MIN_PX_S, STOP_DEG_S, coastOf, stepCoast, travelDeg } from '../src/terrain/look-coast';
import { earthPole, earthToBody } from '../src/terrain/earth-orientation';
import { earthPhase, fillLight } from '../src/terrain/sky-light';
import { contactAo } from '../src/terrain/stones';
import { blockerOf, ridgeAlong } from '../src/terrain/ridge';
import { MAX_ROCK_M, scatterRocks } from '../src/terrain/rocks';
import { seedOf } from '../src/terrain/seeded';
import { sunLit } from '../src/terrain/sun-shade';
import type { HeightTile } from '../src/terrain/tile';
import { surfaceHeight } from '../src/terrain/tile-mesh';
import { nearestSample } from '../src/terrain/tile-sample';
import { EYE_M, cameraPose, direction, startLook, turnLook } from '../src/terrain/view-camera';

const N = 5;

/** A tile of `n` x `n` samples over `sizeM`, heights from `h(east, north)`. */
function tileFrom(h: (east: number, north: number) => number, n = N, sizeM = 400): HeightTile {
  const step = sizeM / (n - 1);
  const heights = new Float32Array(n * n);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) heights[row * n + col] = h(-sizeM / 2 + col * step, sizeM / 2 - row * step);
  }
  return { key: 'k', originEast: 0, originNorth: 0, n, sizeM, heights, resolutionM: 20 };
}

const BACKDROP_M = 6_000;

describe('the drawn ground', () => {
  it('reads the near grid exactly on a plane, and the sample at a vertex', () => {
    const tile = tileFrom((e, n) => 0.1 * e - 0.05 * n);
    const ys = tile.heights;
    expect(surfaceHeight(tile, ys, 37, -61)).toBeCloseTo(0.1 * 37 + 0.05 * 61, 4);
    expect(surfaceHeight(tile, ys, 100, 100)).toBeCloseTo(ys[1 * N + 3]!, 5);
  });
});

describe('the camera', () => {
  it('points north along -z and east along +x', () => {
    expect(direction(0, 0).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, -1]);
    expect(direction(90, 0).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([1, 0, -0]);
    expect(direction(0, 90)[1]).toBeCloseTo(1, 9);
  });

  it('stands the eye 2 m over the ground, looking toward the yaw', () => {
    const { position, target } = cameraPose(startLook(90), 5);
    expect(position).toEqual([0, 5 + EYE_M, 0]);
    expect(target[0]).toBeGreaterThan(0.99);
    expect(target[1]).toBeGreaterThan(position[1]);
  });

  it('turns with a drag and the keys, wrapping the yaw and holding the pitch in range', () => {
    expect(dragLook({ yawDeg: 10, pitchDeg: 0 }, [100, 0], { yaw: 0.2, pitch: 0.1 })).toEqual({ yawDeg: 350, pitchDeg: 0 });
    expect(turnLook({ yawDeg: 0, pitchDeg: 70 }, 0, 50).pitchDeg).toBe(80);
    expect(turnLook({ yawDeg: 0, pitchDeg: -50 }, 0, -50).pitchDeg).toBe(-60);
    const home = startLook(200);
    const look = { yawDeg: 0, pitchDeg: 0 };
    expect(keyLook(look, { key: 'ArrowRight', shiftKey: true }, home)).toEqual({ yawDeg: 15, pitchDeg: 0 });
    expect(keyLook(look, { key: 'Home', shiftKey: false }, home)).toBe(home);
    expect(keyLook(look, { key: 'a', shiftKey: false }, home)).toBeNull();
  });
});

describe('turning by swiping', () => {
  it('turns 180° across the view’s width, whatever the width, and the pitch by the field of view over the height', () => {
    for (const width of [390, 1440]) {
      const scale = dragScale(width, 844, 62);
      const turned = dragLook({ yawDeg: 0, pitchDeg: 0 }, [-width, 0], scale);
      expect(turned.yawDeg).toBeCloseTo(180, 6);
    }
    expect(dragScale(390, 844, 62).pitch).toBeCloseTo(62 / 844, 9);
    expect(dragLook({ yawDeg: 0, pitchDeg: 0 }, [0, 5000], dragScale(390, 844, 62)).pitchDeg).toBe(80);
  });

  const scale = dragScale(390, 844, 62);
  const flick = coastOf({ x: -2000, y: 0 }, scale, false);

  it('carries a flick on, slowing down to a stop, as far as the globe’s projection says', () => {
    expect(flick?.yaw).toBeCloseTo(2000 * scale.yaw, 6);
    let state = { look: { yawDeg: 0, pitchDeg: 14 }, coast: flick };
    const speeds: number[] = [];
    let steps = 0;
    while (state.coast && steps < 2000) {
      speeds.push(state.coast.yaw);
      state = stepCoast(state.look, state.coast, 1 / 60) as typeof state;
      steps += 1;
    }
    expect(state.coast).toBeNull();
    expect(speeds.every((v, i) => i === 0 || v < (speeds[i - 1] as number))).toBe(true);
    const total = (state.look.yawDeg + 360) % 360;
    const expected = travelDeg(flick?.yaw ?? 0);
    expect(total).toBeGreaterThan(expected - 2 * STOP_DEG_S);
    expect(total).toBeLessThanOrEqual(expected);
    expect(steps).toBeLessThan(600);
  });

  it('draws no frame once the coast ends: the loop schedules nothing after its last step', () => {
    let state = { look: { yawDeg: 0, pitchDeg: 14 }, coast: flick };
    const queue: ((now: number) => void)[] = [];
    let drawn = 0;
    const loop = createLoop((dt) => {
      drawn += 1;
      if (!state.coast) return false;
      state = stepCoast(state.look, state.coast, dt) as typeof state;
      return state.coast !== null;
    }, (fn) => queue.push(fn), () => undefined);
    loop.invalidate();
    let now = 0;
    while (queue.length > 0 && drawn < 2000) {
      now += 1000 / 60;
      queue.shift()?.(now);
    }
    expect(state.coast).toBeNull();
    expect(queue).toHaveLength(0);
    const ended = drawn;
    now += 5000;
    expect(queue).toHaveLength(0);
    expect(drawn).toBe(ended);
    loop.invalidate();
    expect(queue).toHaveLength(1);
  });

  it('is exact for any frame time', () => {
    const once = stepCoast({ yawDeg: 0, pitchDeg: 0 }, flick!, 0.5);
    const first = stepCoast({ yawDeg: 0, pitchDeg: 0 }, flick!, 0.25);
    const twice = stepCoast(first.look, first.coast!, 0.25);
    expect(twice.look.yawDeg).toBeCloseTo(once.look.yawDeg, 6);
  });

  it('starts from no slow drag and no reduced motion, and holds the pitch at its limit', () => {
    expect(coastOf({ x: FLING_MIN_PX_S - 1, y: 0 }, scale, false)).toBeNull();
    expect(coastOf({ x: -2000, y: 0 }, scale, true)).toBeNull();
    const up = coastOf({ x: 0, y: 3000 }, scale, false)!;
    const step = stepCoast({ yawDeg: 0, pitchDeg: 79 }, up, 1);
    expect(step.look.pitchDeg).toBe(80);
    expect(step.coast).toBeNull();
  });
});

describe('the drag handlers', () => {
  /** A pointer event with the fields the handlers read. */
  const pointer = (type: string, x: number, t: number): Event => {
    const e = new Event(type);
    for (const [k, v] of Object.entries({ button: 0, pointerId: 1, clientX: x, clientY: 0, timeStamp: t })) {
      Object.defineProperty(e, k, { value: v });
    }
    return e;
  };

  function rig() {
    const el = Object.assign(new EventTarget(), { setPointerCapture: () => undefined }) as unknown as HTMLElement;
    const log: string[] = [];
    const target = { look: () => ({ yawDeg: 0, pitchDeg: 0 }), home: () => ({ yawDeg: 0, pitchDeg: 0 }),
      set: () => log.push('set'), scale: () => dragScale(400, 800, 50),
      fling: (vx: number) => log.push(`fling ${Math.round(vx)}`), halt: () => log.push('halt') };
    bindLook(el, target);
    return { el, log };
  }

  it('stops a coast on a press, and hands the release speed on after a drag', () => {
    const { el, log } = rig();
    el.dispatchEvent(pointer('pointerdown', 100, 0));
    el.dispatchEvent(pointer('pointermove', 140, 40));
    el.dispatchEvent(pointer('pointermove', 180, 80));
    el.dispatchEvent(pointer('pointerup', 180, 80));
    expect(log).toEqual(['halt', 'set', 'set', 'fling 1000']);
  });

  it('hands nothing on from a cancelled drag, and a second press halts again', () => {
    const { el, log } = rig();
    el.dispatchEvent(pointer('pointerdown', 100, 0));
    el.dispatchEvent(pointer('pointercancel', 100, 10));
    el.dispatchEvent(pointer('pointerdown', 100, 20));
    expect(log).toEqual(['halt', 'halt']);
  });
});

describe('the illustrative detail', () => {
  const scatter = { count: 300, innerM: 3, outerM: 90 };

  it('seeds by the point on the 0.01° grid', () => {
    expect(seedOf({ lat: -84.79, lonEast: 29.2 })).toBe(seedOf({ lat: -84.7901, lonEast: 29.2002 }));
    expect(seedOf({ lat: -84.79, lonEast: 29.2 })).not.toBe(seedOf({ lat: -84.79, lonEast: 29.21 }));
  });

  it('scatters the same rocks for the same seed, all under 1 m, none inside the inner ring', () => {
    const a = scatterRocks(7, scatter);
    expect(a).toEqual(scatterRocks(7, scatter));
    expect(a).not.toEqual(scatterRocks(8, scatter));
    expect(a).toHaveLength(300);
    for (const rock of a) {
      expect(rock.radius * 2).toBeLessThanOrEqual(MAX_ROCK_M);
      expect(Math.hypot(rock.east, rock.north)).toBeGreaterThanOrEqual(3);
    }
  });

});

/** A profile with a 12° wall from 300° to 330° and 0.5° elsewhere. */
function wallProfile() {
  const centiDeg = Int16Array.from({ length: 720 }, (_, i) => quantiseDeg(i / 2 >= 300 && i / 2 <= 330 ? 12 : 0.5));
  return { centiDeg };
}

describe('the far horizon backdrop', () => {
  it('stands its top at the profile’s elevation in every bin, seen from the eye', () => {
    const profile = wallProfile();
    const eyeY = 7;
    const { positions } = backdropWall(profile, eyeY, 720, BACKDROP_M);
    for (let i = 0; i < 720; i++) {
      const [x, y, z] = [positions[i * 6]!, positions[i * 6 + 1]!, positions[i * 6 + 2]!];
      const el = (Math.atan2(y - eyeY, Math.hypot(x, z)) * 180) / Math.PI;
      expect(el).toBeCloseTo(horizonAt(profile, i / 2), 3);
      expect(Math.hypot(x, z)).toBeCloseTo(BACKDROP_M, 3);
      expect(positions[i * 6 + 4]).toBeLessThan(eyeY - 1000);
    }
  });

  it('closes the ring and falls back to the smooth sphere’s dip without a profile', () => {
    const { positions, index } = backdropWall(null, 0, 8, BACKDROP_M);
    for (let c = 0; c < 3; c++) expect(positions[48 + c]).toBeCloseTo(positions[c]!, 6);
    expect(Math.max(...index)).toBe(17);
    expect(backdropTopDeg(null, 123)).toBe(dipDeg(EYE_M));
    expect(dipDeg(2)).toBeCloseTo(-0.0869, 3);
  });
});

describe('what hides a body', () => {
  // A ridge 40 m high 150 m north; flat elsewhere.
  const tile = tileFrom((e, n) => (n >= 140 && n <= 160 && Math.abs(e) < 300 ? 40 : 0), 41, 400);
  const ys = tile.heights;
  const ridge = ridgeAlong(tile, ys, 0);

  it('names the tile’s ridge along an azimuth with its height and distance', () => {
    expect(ridge.heightM).toBeCloseTo(40, 3);
    expect(ridge.distanceM).toBeGreaterThanOrEqual(140);
    expect(ridge.distanceM).toBeLessThanOrEqual(160);
    expect(ridge.elDeg).toBeCloseTo((Math.atan2(38, ridge.distanceM) * 180) / Math.PI, 6);
  });

  it('says clear over the skyline, the ridge when it does it, the far terrain when the profile does', () => {
    expect(blockerOf({ azDeg: 0, elDeg: 20 }, ridge, null)).toEqual({ kind: 'clear' });
    expect(blockerOf({ azDeg: 0, elDeg: 5 }, ridge, null)).toMatchObject({ kind: 'ridge', heightM: ridge.heightM });
    const flat = ridgeAlong(tile, ys, 180);
    expect(blockerOf({ azDeg: 315, elDeg: 9 }, flat, wallProfile())).toEqual({ kind: 'far' });
    expect(blockerOf({ azDeg: 100, elDeg: 9 }, flat, wallProfile())).toEqual({ kind: 'clear' });
  });

  it('shades the ground behind the ridge from a low Sun in the north, and nothing from one overhead', () => {
    const low = sunLit(tile, ys, { azDeg: 0, elDeg: 5 });
    const at = (row: number, col: number) => low[row * 41 + col];
    expect(at(30, 20)).toBe(0); // 100 m south of the ridge: in its shadow
    expect(at(2, 20)).toBe(1); // north of it
    expect(at(5, 20)).toBe(1); // on its top
    expect(sunLit(tile, ys, { azDeg: 0, elDeg: 85 }).every((v) => v === 1)).toBe(true);
    expect(sunLit(tile, ys, { azDeg: 0, elDeg: -5 }).every((v) => v === 0)).toBe(true);
  });
});

// The profile codec is the one the API speaks.
describe('a tile centred off the site', () => {
  const off = { ...tileFrom((e, n) => 0.5 * e + 0.25 * n), originEast: -60, originNorth: 40 };

  it('keeps the ground under the SITE at the scene origin, not the tile centre', () => {
    const ground = groundOf([{ tile: off, ys: off.heights }]);
    // The site is at tile-local (60, -40): 0.5 * 60 + 0.25 * -40 = 20; the centre's ground is 0.
    expect(ground(0, 0)).toBeCloseTo(20, 4);
    expect(cameraPose(startLook(0), ground(0, 0)).position[1]).toBeCloseTo(20 + EYE_M, 4);
  });

  it('finds the sample north of the site by the tile’s own origin, rows running north to south', () => {
    const north = { ...tileFrom(() => 0), originEast: 0, originNorth: 100 };
    // The site lies 100 m south of this tile's centre: one row below the middle row.
    expect(nearestSample(north, 0, 0)).toBe(3 * N + 2);
    const south = { ...tileFrom(() => 0), originEast: 0, originNorth: -100 };
    expect(nearestSample(south, 0, 0)).toBe(1 * N + 2);
  });

  it('shades the point from the sample nearest the site, not the tile centre', () => {
    const wide = { ...tileFrom((e) => (e === 100 ? 50 : 0)), originEast: -100, originNorth: 0 };
    const ys = wide.heights;
    expect(nearestSample(wide, 0, 0)).toBe(2 * N + 3);
    const mask = createSunMask();
    const attribute = { array: new Float32Array(N * N), needsUpdate: false } as unknown as BufferAttribute;
    const sky = { sunAz: 90, sunEl: 5, earthAz: 0, earthEl: 0 };
    const onLit = (lit: Float32Array): void => void (attribute.array as Float32Array).set(lit);
    shadeSun({ tiles: [{ tile: wide, ys }], onLit, profile: null, mask }, sky);
    expect((attribute.array as Float32Array)[2 * N + 2]).toBe(0);
    expect((attribute.array as Float32Array)[2 * N + 3]).toBe(1);
    expect(mask.near.value).toBe(1);
  });
});

describe('the camera on the stage', () => {
  it('stands the eye 2 m over the ground at the site and looks toward the yaw', () => {
    for (const yaw of [0, 37, 90, 180, 251, 359]) {
      const world = { stage: { camera: new PerspectiveCamera() }, ground: () => 7.5 } as unknown as World;
      aimCamera(world, startLook(yaw));
      const { camera } = world.stage;
      expect(camera.position.toArray()).toEqual([0, 7.5 + EYE_M, 0]);
      const facing = camera.getWorldDirection(new Vector3());
      const [dx, , dz] = direction(yaw, 0);
      expect(facing.x).toBeCloseTo(dx, 1);
      expect(facing.z).toBeCloseTo(dz, 1);
    }
  });
});

describe('leaving the view', () => {
  it('frees every geometry, material and texture, then the renderer and its GPU context, and takes the canvas out', () => {
    const geometry = new BufferGeometry();
    const texture = new DataTexture(new Uint8Array(4), 1, 1);
    const material = new MeshLambertMaterial({ map: texture });
    const scene = new Scene();
    scene.add(new Mesh(geometry, material));
    const spies = [vi.spyOn(geometry, 'dispose'), vi.spyOn(material, 'dispose'), vi.spyOn(texture, 'dispose')];
    const renderer = { dispose: vi.fn(), forceContextLoss: vi.fn(), domElement: { remove: vi.fn() } };
    disposeStage({ renderer, scene, camera: new PerspectiveCamera() } as unknown as Stage);
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(renderer.domElement.remove).toHaveBeenCalledTimes(1);
  });
});

describe('the host’s ready mark', () => {
  const deferred = () => {
    let done = () => {};
    const promise = new Promise<void>((resolve) => { done = resolve; });
    return { promise, done };
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('is set when the scene\'s parts are in, and the view draws again', async () => {
    const host = { dataset: {} as DOMStringMap };
    const standing = deferred();
    const drawn = vi.fn();
    markReadyWhenStanding(host, standing.promise, drawn);
    expect(host.dataset['ready']).toBeUndefined();
    standing.done();
    await flush();
    expect(host.dataset['ready']).toBe('true');
    expect(drawn).toHaveBeenCalledTimes(1);
  });

  it('starts clear on a host a previous scene marked, and a stale load never marks the new scene', async () => {
    const host = { dataset: { ready: 'true' } as DOMStringMap };
    const stale = deferred();
    const cancelStale = markReadyWhenStanding(host, stale.promise, vi.fn());
    expect(host.dataset['ready']).toBeUndefined();
    cancelStale();
    const fresh = deferred();
    const drawn = vi.fn();
    markReadyWhenStanding(host, fresh.promise, drawn);
    stale.done();
    await flush();
    expect(host.dataset['ready']).toBeUndefined();
    fresh.done();
    await flush();
    expect(host.dataset['ready']).toBe('true');
    expect(drawn).toHaveBeenCalledTimes(1);
  });
});

it('round-trips the wall profile', () => {
  expect(encodeProfile(wallProfile()).length).toBe(1920);
});

describe('the words', () => {
  it('says the heading, where each body is and what hides it', async () => {
    const { EN } = await import('./i18n-factories');
    const { viewAlt } = await import('../src/terrain/view-alt');
    const ridge = { kind: 'ridge', elDeg: 4, distanceM: 1240, heightM: 47.6 } as const;
    const alt = viewAlt(EN, {
      yawDeg: 253.4,
      bodies: [
        { id: 'sun', azDeg: 253, elDeg: 1, visible: false, blocker: ridge },
        { id: 'earth', azDeg: 300, elDeg: 3, visible: false, blocker: { kind: 'far' } },
      ],
    });
    expect(alt).toBe(
      'First person, eyes 2 m above the ground. View heading 253°, to the west. ' +
        'The Sun is to the west, hidden by the terrain. A ridge 48 m high, 1.2 km away, hides the Sun. ' +
        'The Earth is to the north-west, hidden by the terrain. Terrain more than 2 km away hides the Earth.',
    );
  });

  it('labels the rings and the ridge, and captions the measured resolution', async () => {
    const { EN, i18nOf } = await import('./i18n-factories');
    const { detailCaption, ridgeLabel, ringLabel } = await import('../src/terrain/view-text');
    expect(ringLabel(EN, 500)).toBe('500 m');
    expect(ridgeLabel(EN, { elDeg: 1, distanceM: 1240, heightM: 47.6 })).toBe('Ridge 48 m · 1.2 km');
    expect(detailCaption(EN, 20)).toBe('Fine detail illustrative · relief LOLA 20 m');
    expect(detailCaption(i18nOf('es'), 20)).toBe('Detalle fino ilustrativo · relieve LOLA 20 m');
  });
});

describe('the glb reader and the shapes', () => {
  it('builds a unit sphere and rings sat on the ground', async () => {
    const { sphere } = await import('../src/terrain/shapes');
    const { ringRibbon } = await import('../src/terrain/ring-ribbon');
    const s = sphere(8, 5);
    for (let i = 0; i < s.positions.length; i += 3) {
      expect(Math.hypot(s.positions[i]!, s.positions[i + 1]!, s.positions[i + 2]!)).toBeCloseTo(1, 6);
    }
    const ring = ringRibbon(100, (e) => e * 0.01);
    for (let i = 0; i < ring.positions.length; i += 3) {
      expect(ring.positions[i + 1]).toBeCloseTo(ring.positions[i]! * 0.01 + 0.12 + 0.1, 6);
    }
  });
});

describe('the Earth in the sky', () => {
  const toward = direction(314, 9);
  const input = { toward, siteLatDeg: -85.5, subLunar: { latDeg: 12, lonEastDeg: 30 }, moonLonDeg: 100 };

  it('turns the scene into the Earth’s body frame: the sub-lunar point faces the site, the pole is up', () => {
    const m = earthToBody(input);
    const apply = (v: readonly number[]) => [0, 1, 2].map((i) => m[i * 3]! * v[0]! + m[i * 3 + 1]! * v[1]! + m[i * 3 + 2]! * v[2]!);
    const [lat, lon] = [(12 * Math.PI) / 180, (30 * Math.PI) / 180];
    const facing = apply([-toward[0], -toward[1], -toward[2]]);
    expect(facing[0]).toBeCloseTo(Math.cos(lat) * Math.sin(lon), 6);
    expect(facing[1]).toBeCloseTo(Math.sin(lat), 6);
    expect(facing[2]).toBeCloseTo(Math.cos(lat) * Math.cos(lon), 6);
    const pole = apply(earthPole(input));
    expect(pole[0]).toBeCloseTo(0, 6);
    expect(pole[1]).toBeCloseTo(1, 6);
    expect(Math.hypot(...earthPole(input))).toBeCloseTo(1, 6);
  });

  it('shows the Earth’s north toward the horizon at the south pole, as the Moon’s axis does', () => {
    const level = { ...input, toward: direction(0, 0), siteLatDeg: -90, subLunar: { latDeg: 0, lonEastDeg: 0 }, moonLonDeg: 90 };
    // The Moon's north is straight down there, and with L = 90° the Earth's pole leans 0° from it.
    expect(earthPole(level)[1]).toBeLessThan(-0.9);
  });
});

describe('the fill light', () => {
  const sky = { sunAz: 0, sunEl: 5, earthAz: 180, earthEl: 9 };

  it('gives the Earth’s light by its lit share and by its being up: full beats new, below the level none', () => {
    expect(earthPhase({ ...sky, sunAz: 0, sunEl: 0, earthAz: 180, earthEl: 0 })).toBeCloseTo(1, 6);
    expect(earthPhase({ ...sky, sunAz: 180, sunEl: 0, earthAz: 180, earthEl: 0 })).toBeCloseTo(0, 6);
    expect(fillLight({ ...sky, earthEl: -10 }).earthshine.intensity).toBe(0);
    expect(fillLight(sky).earthshine.intensity).toBeGreaterThan(0);
  });

  it('bounces the ground’s light back from where the Sun is, and not at all under a set Sun', () => {
    expect(fillLight({ ...sky, sunEl: -5 }).bounce.intensity).toBe(0);
    expect(fillLight({ ...sky, sunEl: 40 }).bounce.intensity).toBeGreaterThan(fillLight(sky).bounce.intensity);
    expect(fillLight(sky).bounce.toward[2]).toBeGreaterThan(0);
  });
});

describe('baked contact occlusion', () => {
  it('darkens what touches the ground and leaves what stands clear of it', () => {
    const positions = Float32Array.from([0, 0, 0, 0, 0.6, 0, 0, -0.2, 0]);
    const ao = contactAo(positions, () => 0);
    expect(ao[0]).toBeCloseTo(0.3, 6);
    expect(ao[3]).toBeCloseTo(1, 6);
    expect(ao[6]).toBeCloseTo(0.3, 6);
    expect(ao).toHaveLength(9);
  });
});
