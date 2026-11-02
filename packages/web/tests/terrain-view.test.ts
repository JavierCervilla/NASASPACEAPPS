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
import { encodeHeights, encodeProfile, horizonAt, quantiseDeg } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { NoTerrainHereError, TerrainNotInstalledError, TransientHorizonError } from '../src/horizon/horizon-errors';
import { BACKDROP_M, backdropTopDeg, backdropWall, dipDeg } from '../src/terrain/far-horizon';
import { BufferGeometry, DataTexture, Mesh, MeshLambertMaterial, PerspectiveCamera, Group, Scene, Vector3, type BufferAttribute } from 'three';
import { markReadyWhenStanding } from '../src/terrain/scene/ready-mark';
import { disposeStage, type Stage } from '../src/terrain/scene/stage';
import { createSunMask } from '../src/terrain/scene/sun-mask';
import { aimCamera } from '../src/terrain/scene/camera-apply';
import { shadeSun } from '../src/terrain/scene/sky-place';
import { groundOf } from '../src/terrain/scene/world-ground';
import type { World } from '../src/terrain/scene/world';
import { dragLook, keyLook } from '../src/terrain/look-input';
import { earthPole, earthToBody } from '../src/terrain/earth-orientation';
import { earthPhase, fillLight } from '../src/terrain/sky-light';
import { contactAo } from '../src/terrain/stones';
import { blockerOf, ridgeAlong } from '../src/terrain/ridge';
import { MAX_ROCK_M, scatterRocks } from '../src/terrain/rocks';
import { seedOf } from '../src/terrain/seeded';
import { sunLit } from '../src/terrain/sun-shade';
import { tileOf, tileUrl, type HeightTile } from '../src/terrain/tile';
import { askTile, fetchTileSource } from '../src/terrain/tile-fetch';
import { MOON_RADIUS_M, gridIndex, meshHeights, surfaceHeight, tileBuffers } from '../src/terrain/tile-mesh';
import { nearestSample } from '../src/terrain/tile-sample';
import { EYE_M, ORBIT_M, cameraPose, direction, startLook, turnLook } from '../src/terrain/view-camera';

const SITES = 'https://ventana.example/api/v1/sites';
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

const SITE_ON_GRID = { lat: -84.79, lonEast: 29.2 };

describe('tileOf and tileUrl', () => {
  const heights = encodeHeights(Float32Array.from({ length: N * N }, (_, i) => i));
  const body = { lat: -84.79, lonEast: 29.2, sizeM: 4000, n: N, groundM: 5321.3, heights, resolutionM: 20 };

  it('reads the API answer into transferable heights, keyed, centred on the site', () => {
    const tile = tileOf(body, SITE_ON_GRID);
    expect(tile).toMatchObject({ key: '-84.79,29.2,4000', n: N, sizeM: 4000, resolutionM: 20 });
    expect(Math.hypot(tile?.originEast ?? 1, tile?.originNorth ?? 1)).toBeLessThan(1e-6);
    expect(tile?.heights).toBeInstanceOf(Float32Array);
    expect(Array.from(tile?.heights ?? [])).toEqual(Array.from({ length: N * N }, (_, i) => i));
  });

  it('refuses an answer that is not a tile: short heights, no side, bad base64', () => {
    expect(tileOf({ ...body, n: N + 1 }, SITE_ON_GRID)).toBeNull();
    expect(tileOf({ ...body, n: 'x' }, SITE_ON_GRID)).toBeNull();
    expect(tileOf({ ...body, heights: '%%' }, SITE_ON_GRID)).toBeNull();
    expect(tileOf(null, SITE_ON_GRID)).toBeNull();
  });

  it('refuses an answer with no centre, or one that is not a number', () => {
    expect(tileOf({ ...body, lat: undefined }, SITE_ON_GRID)).toBeNull();
    expect(tileOf({ ...body, lat: 'south' }, SITE_ON_GRID)).toBeNull();
    expect(tileOf({ ...body, lonEast: undefined }, SITE_ON_GRID)).toBeNull();
    expect(tileOf({ ...body, lonEast: 'east' }, SITE_ON_GRID)).toBeNull();
  });

  it('puts the tile’s centre where the grid point is from the site: east and north in metres, the site at the origin', () => {
    const site = { lat: -84.7912, lonEast: 29.2049 };
    const tile = tileOf(body, site);
    const rad = Math.PI / 180;
    const north = (-84.79 - site.lat) * rad * MOON_RADIUS_M;
    const east = (29.2 - site.lonEast) * rad * Math.cos(site.lat * rad) * MOON_RADIUS_M;
    expect(tile?.originNorth).toBeCloseTo(north, 1);
    expect(tile?.originEast).toBeCloseTo(east, 1);
    expect(north).toBeGreaterThan(30);
    expect(east).toBeLessThan(-10);
  });

  it('wraps the longitude across the seam and stays exact next to the pole', () => {
    const seam = tileOf({ ...body, lat: -85, lonEast: 0 }, { lat: -85, lonEast: 359.996 });
    expect(seam?.originEast).toBeCloseTo(0.004 * (Math.PI / 180) * Math.cos((85 * Math.PI) / 180) * MOON_RADIUS_M, 1);
    const pole = tileOf({ ...body, lat: -89.99, lonEast: 90 }, { lat: -89.9949, lonEast: 90 });
    expect(pole?.originNorth).toBeCloseTo(0.0049 * (Math.PI / 180) * MOON_RADIUS_M, 0);
    expect(pole?.originEast ?? 1).toBeCloseTo(0, 3);
  });

  it('asks the sites endpoint’s sibling on the 0.01° grid with the size', () => {
    expect(tileUrl(SITES, { lat: -84.7912, lonEast: 29.2049 }, 4000)).toBe(
      'https://ventana.example/api/v1/terrain/tile?lat=-84.79&lon=29.20&size=4000',
    );
  });
});

describe('the tries', () => {
  const waits = { sleep: async () => undefined, random: () => 0.5 };
  const point = { lat: -85, lonEast: 40 };
  const failing = (errors: Error[], tile?: HeightTile) => {
    let i = 0;
    return { get: async () => { const e = errors[i++]; if (e) throw e; if (!tile) throw new Error('none'); return tile; } };
  };

  it('asks again after a passing failure and shows the tile when it comes', async () => {
    const tile = tileFrom(() => 0);
    const state = await askTile({ source: failing([new TransientHorizonError(null)], tile), point, sizeM: 4000 }, waits);
    expect(state).toEqual({ kind: 'tile', tile });
  });

  it('stops at once on a 404 or a server with no terrain, and after four passing failures', async () => {
    const ask = (errors: Error[]) => askTile({ source: failing(errors), point, sizeM: 4000 }, waits);
    expect(await ask([new NoTerrainHereError()])).toEqual({ kind: 'noTerrain' });
    expect(await ask([new TerrainNotInstalledError()])).toEqual({ kind: 'notInstalled' });
    const passing = Array.from({ length: 4 }, () => new TransientHorizonError(null));
    expect(await ask(passing)).toEqual({ kind: 'unavailable' });
  });

  it('classifies the API’s answers as the horizon does', async () => {
    const answer = (status: number, json: object) => async () => new Response(JSON.stringify(json), { status });
    const get = (status: number, json: object) =>
      fetchTileSource(answer(status, json) as unknown as typeof fetch, SITES).get(point, 4000);
    await expect(get(404, { error: 'no terrain' })).rejects.toBeInstanceOf(NoTerrainHereError);
    await expect(get(503, { error: 'terrain data is not installed' })).rejects.toBeInstanceOf(TerrainNotInstalledError);
    await expect(get(429, { error: 'slow down' })).rejects.toBeInstanceOf(TransientHorizonError);
    await expect(get(200, { not: 'a tile' })).rejects.toBeInstanceOf(TransientHorizonError);
  });

  it('places the tile from the site it was asked for, off the 0.01° grid', async () => {
    const heights = encodeHeights(Float32Array.from({ length: N * N }, (_, i) => i));
    const body = { lat: -84.79, lonEast: 29.2, sizeM: 4000, n: N, groundM: 5321.3, heights, resolutionM: 20 };
    const fetcher = (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
    const site = { lat: -84.7912, lonEast: 29.2049 };
    const tile = await fetchTileSource(fetcher, SITES).get(site, 4000);
    expect(tile.originNorth).toBeCloseTo((-84.79 - site.lat) * (Math.PI / 180) * MOON_RADIUS_M, 1);
    expect(tile.originNorth).toBeGreaterThan(30);
    expect(tile.originEast).toBeLessThan(-10);
  });
});

describe('the mesh', () => {
  it('lowers each sample by the curvature’s fall from the origin, nothing at the centre', () => {
    const tile = tileFrom(() => 10);
    const ys = meshHeights(tile);
    expect(ys[2 * N + 2]).toBe(10);
    const corner = Math.hypot(200, 200);
    expect(ys[0]).toBeCloseTo(10 - (corner * corner) / (2 * MOON_RADIUS_M), 6);
  });

  it('places a tile by its origin in the session frame: x east, z south', () => {
    const tile = { ...tileFrom(() => 0), originEast: 1000, originNorth: -500 };
    const { positions, normals, index } = tileBuffers(tile, new Float32Array(N * N));
    expect(Array.from(positions.slice(0, 3))).toEqual([800, 0, 300]);
    expect(Array.from(normals.slice(0, 3))).toEqual([-0, 1, -0]);
    expect(index).toHaveLength((N - 1) ** 2 * 6);
  });

  it('winds every triangle counter-clockwise seen from above (normals up)', () => {
    const tile = tileFrom(() => 0);
    const { positions } = tileBuffers(tile, new Float32Array(N * N));
    const index = gridIndex(N);
    for (let k = 0; k < index.length; k += 3) {
      const [a, b, c] = [index[k]!, index[k + 1]!, index[k + 2]!].map((i) => [positions[i * 3]!, positions[i * 3 + 2]!]);
      const crossY = (b![1]! - a![1]!) * (c![0]! - a![0]!) - (b![0]! - a![0]!) * (c![1]! - a![1]!);
      expect(crossY).toBeGreaterThan(0);
    }
  });

  it('reads the drawn ground exactly on a plane, and the sample at a vertex', () => {
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

  it('opens in third person behind the astronaut, looking past it toward the yaw', () => {
    const look = startLook('third', 90);
    const { position, target } = cameraPose('third', look, 5, () => 0);
    expect(position[0]).toBeLessThan(0);
    expect(Math.hypot(position[0], position[1] - target[1], position[2])).toBeCloseTo(ORBIT_M, 6);
    expect(position[1]).toBeGreaterThan(target[1]);
  });

  it('stands the first-person eye 2 m over the ground', () => {
    const { position } = cameraPose('first', startLook('first', 0), 5, () => 0);
    expect(position).toEqual([0, 5 + EYE_M, 0]);
  });

  it('keeps the third-person camera above a hill behind it', () => {
    const { position } = cameraPose('third', startLook('third', 0), 0, () => 30);
    expect(position[1]).toBeCloseTo(30.5, 6);
  });

  it('turns with a drag and the keys, wrapping the yaw and holding the pitch in range', () => {
    expect(dragLook('first', { yawDeg: 10, pitchDeg: 0 }, [100, 0], 0.2)).toEqual({ yawDeg: 350, pitchDeg: 0 });
    expect(turnLook('first', { yawDeg: 0, pitchDeg: 70 }, 0, 50).pitchDeg).toBe(80);
    expect(turnLook('third', { yawDeg: 0, pitchDeg: 10 }, 0, -50).pitchDeg).toBe(3);
    const home = startLook('first', 200);
    const look = { yawDeg: 0, pitchDeg: 0 };
    expect(keyLook('first', look, { key: 'ArrowRight', shiftKey: true }, home)).toEqual({ yawDeg: 15, pitchDeg: 0 });
    expect(keyLook('first', look, { key: 'Home', shiftKey: false }, home)).toBe(home);
    expect(keyLook('first', look, { key: 'a', shiftKey: false }, home)).toBeNull();
  });
});

describe('the illustrative detail', () => {
  const scatter = { count: 300, innerM: 3, outerM: 90, clear: [{ east: 20, north: 20, r: 5 }] };

  it('seeds by the point on the 0.01° grid', () => {
    expect(seedOf({ lat: -84.79, lonEast: 29.2 })).toBe(seedOf({ lat: -84.7901, lonEast: 29.2002 }));
    expect(seedOf({ lat: -84.79, lonEast: 29.2 })).not.toBe(seedOf({ lat: -84.79, lonEast: 29.21 }));
  });

  it('scatters the same rocks for the same seed, all under 1 m, none in a clear disc', () => {
    const a = scatterRocks(7, scatter);
    expect(a).toEqual(scatterRocks(7, scatter));
    expect(a).not.toEqual(scatterRocks(8, scatter));
    expect(a).toHaveLength(300);
    for (const rock of a) {
      expect(rock.radius * 2).toBeLessThanOrEqual(MAX_ROCK_M);
      expect(Math.hypot(rock.east - 20, rock.north - 20)).toBeGreaterThan(5);
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
    const { positions } = backdropWall(profile, eyeY, 720);
    for (let i = 0; i < 720; i++) {
      const [x, y, z] = [positions[i * 6]!, positions[i * 6 + 1]!, positions[i * 6 + 2]!];
      const el = (Math.atan2(y - eyeY, Math.hypot(x, z)) * 180) / Math.PI;
      expect(el).toBeCloseTo(horizonAt(profile, i / 2), 3);
      expect(Math.hypot(x, z)).toBeCloseTo(BACKDROP_M, 3);
      expect(positions[i * 6 + 4]).toBeLessThan(eyeY - 1000);
    }
  });

  it('closes the ring and falls back to the smooth sphere’s dip without a profile', () => {
    const { positions, index } = backdropWall(null, 0, 8);
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
    expect(cameraPose('first', startLook('first', 0), ground(0, 0), ground).position[1]).toBeCloseTo(20 + EYE_M, 4);
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
    const ys = meshHeights(wide);
    expect(nearestSample(wide, 0, 0)).toBe(2 * N + 3);
    const mask = createSunMask();
    const attribute = { array: new Float32Array(N * N), needsUpdate: false } as unknown as BufferAttribute;
    const sky = { sunAz: 90, sunEl: 5, earthAz: 0, earthEl: 0 };
    shadeSun({ tiles: [{ tile: wide, ys }], lit: () => attribute, profile: null, mask }, sky);
    expect((attribute.array as Float32Array)[2 * N + 2]).toBe(0);
    expect((attribute.array as Float32Array)[2 * N + 3]).toBe(1);
    expect(mask.near.value).toBe(1);
  });
});

describe('the astronaut’s pose', () => {
  const worldOf = (ground: (e: number, n: number) => number) => ({
    stage: { camera: new PerspectiveCamera() }, astronaut: new Group(), ground,
  }) as unknown as World;

  it('faces where the view looks, its back to the third-person camera', () => {
    for (const yaw of [0, 37, 90, 180, 251, 359]) {
      const world = worldOf(() => 0);
      aimCamera(world, 'third', startLook('third', yaw));
      const facing = world.astronaut.getWorldDirection(new Vector3());
      const [dx, , dz] = direction(yaw, 0);
      expect(facing.x).toBeCloseTo(dx, 6);
      expect(facing.z).toBeCloseTo(dz, 6);
      const toCamera = world.stage.camera.position.clone().setY(0).normalize();
      expect(facing.dot(toCamera)).toBeLessThan(-0.99);
    }
  });

  it('stands on the ground at the site', () => {
    const world = worldOf(() => 7.5);
    aimCamera(world, 'third', startLook('third', 10));
    expect(world.astronaut.position.toArray()).toEqual([0, 7.5, 0]);
  });

  it('has the shipped model’s visor on +z, the way the pose assumes', async () => {
    const { readFileSync } = await import('node:fs');
    const { readGlb } = await import('../src/terrain/glb');
    const file = readFileSync(new URL('../models/astronaut.glb', import.meta.url));
    const model = readGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    const meanZ = (p: (typeof model.primitives)[number]) => {
      const a = p.position.array;
      let sum = 0;
      for (let i = 2; i < a.length; i += 3) sum += a[i]!;
      return sum / (a.length / 3);
    };
    const [suit, visor] = model.primitives;
    expect(meanZ(visor!)).toBeGreaterThan(meanZ(suit!));
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

  it('is set when the astronaut stands, and the view draws again', async () => {
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

  it('starts clear on a host a previous scene marked, and a stale astronaut never marks the new scene', async () => {
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
      mode: 'third',
      yawDeg: 253.4,
      bodies: [
        { id: 'sun', azDeg: 253, elDeg: 1, visible: false, blocker: ridge },
        { id: 'earth', azDeg: 300, elDeg: 3, visible: false, blocker: { kind: 'far' } },
      ],
    });
    expect(alt).toBe(
      'Third person: an astronaut stands on the point. View heading 253°, to the west. ' +
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

describe('the astronaut and the shapes', () => {
  it('reads the shipped glb: two primitives, packed int16 positions, indices in range', async () => {
    const { readFileSync } = await import('node:fs');
    const { readGlb } = await import('../src/terrain/glb');
    const file = readFileSync(new URL('../models/astronaut.glb', import.meta.url));
    const model = readGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    expect(model.primitives).toHaveLength(2);
    const suit = model.primitives[0]!;
    expect(suit.position.array).toBeInstanceOf(Int16Array);
    expect(suit.position.array).toHaveLength(4020 * 3);
    expect(suit.position.normalized).toBe(true);
    expect(suit.index.array).toHaveLength(18639);
    expect(Math.max(...suit.index.array)).toBeLessThan(4020);
    expect(model.scale).toBeGreaterThan(1);
  });

  it('builds a closed tube, a unit sphere and rings sat on the ground', async () => {
    const { sphere, tube } = await import('../src/terrain/shapes');
    const { ringRibbon } = await import('../src/terrain/ring-ribbon');
    const t = tube({ from: [0, 0, 0], to: [0, 2, 0], radiusFrom: 1, radiusTo: 0.5, sides: 6 });
    expect(t.index).toHaveLength(6 * 12);
    expect(Math.max(...t.index)).toBeLessThan(t.positions.length / 3);
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
