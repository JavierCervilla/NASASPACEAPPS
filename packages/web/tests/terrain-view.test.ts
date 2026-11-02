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
import { describe, expect, it } from 'vitest';
import { NoTerrainHereError, TerrainNotInstalledError, TransientHorizonError } from '../src/horizon/horizon-errors';
import { BACKDROP_M, backdropTopDeg, backdropWall, dipDeg } from '../src/terrain/far-horizon';
import { dragLook, keyLook } from '../src/terrain/look-input';
import { regolithMaps } from '../src/terrain/regolith';
import { blockerOf, ridgeAlong } from '../src/terrain/ridge';
import { MAX_ROCK_M, scatterRocks } from '../src/terrain/rocks';
import { seedOf } from '../src/terrain/seeded';
import { sunLit } from '../src/terrain/sun-shade';
import { tileOf, tileUrl, type HeightTile } from '../src/terrain/tile';
import { askTile, fetchTileSource } from '../src/terrain/tile-fetch';
import { MOON_RADIUS_M, gridIndex, meshHeights, surfaceHeight, tileBuffers } from '../src/terrain/tile-mesh';
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

describe('tileOf and tileUrl', () => {
  const heights = encodeHeights(Float32Array.from({ length: N * N }, (_, i) => i));
  const body = { lat: -84.79, lonEast: 29.2, sizeM: 4000, n: N, groundM: 5321.3, heights, resolutionM: 20 };

  it('reads the API answer into transferable heights, keyed, at the session origin', () => {
    const tile = tileOf(body);
    expect(tile).toMatchObject({ key: '-84.79,29.2,4000', originEast: 0, originNorth: 0, n: N, sizeM: 4000, resolutionM: 20 });
    expect(tile?.heights).toBeInstanceOf(Float32Array);
    expect(Array.from(tile?.heights ?? [])).toEqual(Array.from({ length: N * N }, (_, i) => i));
  });

  it('refuses an answer that is not a tile: short heights, no side, bad base64', () => {
    expect(tileOf({ ...body, n: N + 1 })).toBeNull();
    expect(tileOf({ ...body, n: 'x' })).toBeNull();
    expect(tileOf({ ...body, heights: '%%' })).toBeNull();
    expect(tileOf(null)).toBeNull();
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

  it('keeps the regolith grain fine and low in contrast: dust, never a pattern', () => {
    const { roughness } = regolithMaps(5, 64);
    const greys = Array.from({ length: 64 * 64 }, (_, i) => roughness[i * 4 + 1]!);
    expect(Math.max(...greys) - Math.min(...greys)).toBeLessThan(40);
    expect(Math.min(...greys)).toBeGreaterThan(200);
  });

  it('draws the same regolith maps for the same seed, unit normals pointing out', () => {
    const a = regolithMaps(3, 16);
    expect(a.normal).toEqual(regolithMaps(3, 16).normal);
    expect(a.normal).not.toEqual(regolithMaps(4, 16).normal);
    for (let i = 0; i < 16 * 16; i++) {
      const [x, y, z] = [0, 1, 2].map((c) => a.normal[i * 4 + c]! / 127.5 - 1);
      expect(Math.hypot(x!, y!, z!)).toBeCloseTo(1, 1);
      expect(z).toBeGreaterThan(0);
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
