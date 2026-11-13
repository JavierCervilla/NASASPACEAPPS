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
 * The scanned rocks (VENT-124): the address switch, which rocks become
 * scans and where they stand, the committed binary read back, the caption's
 * credit, and the ground the rocks stand on: the surface ring level 0
 * draws at the tier's stride, not the near grid, which buried them at the
 * medium tier.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { switchLine } from '../src/devtools/switch-line';
import { localeHref } from '../src/i18n/switch';
import { MEASURED } from '../src/terrain/rock-law';
import {
  parseRockLook,
  scanPose,
  SCAN_COUNT,
  SCAN_REACH_M,
  scansDrawn,
  shapeIndex,
  splitNearest,
} from '../src/terrain/rock-look';
import type { Rock } from '../src/terrain/rocks';
import { measuredBands } from '../src/terrain/rocks-measured';
import { parseTile } from '../src/terrain/ring/ring-answer';
import { drawnGround } from '../src/terrain/ring/ring-drawn';
import { frameAt, unitOf, type Frame } from '../src/terrain/ring/ring-frame';
import { gridPositions } from '../src/terrain/ring/ring-grid';
import { LOCAL_N, fillRows, heightAtDir, localSize } from '../src/terrain/ring/ring-local';
import { RingStore } from '../src/terrain/ring/ring-store';
import { readScanShapes } from '../src/terrain/scan-rock-file';
import { rocksMesh } from '../src/terrain/scene/props';
import { rockGrounds } from '../src/terrain/scene/rock-ground';
import type { ScanAssets } from '../src/terrain/scene/scan-rocks';
import type { Slicer } from '../src/terrain/scene/slicer';
import { createSunMask } from '../src/terrain/scene/sun-mask';
import { surfaceHeight } from '../src/terrain/tile-mesh';
import { captionNote } from '../src/terrain/view-text';
import { EN } from './i18n-factories';
import { TILE_CELLS } from '@ventana/sim';

const MAPS = new URL('../src/terrain/maps/', import.meta.url);
const FIXTURES = new URL('../../../tests/e2e/fixtures/terrain-ring-im2/', import.meta.url);
const SAMPLES = ['70175-0', '70295-0', '76535-0', '79115-0'];
const IM2 = { lat: -84.79, lonEast: 29.2 };
const N = TILE_CELLS + 1;

const rock = (east: number, north: number, radius = 0.2): Rock =>
  ({ east, north, radius, squash: 0.6, yawRad: east + north });

/** A slicer that runs nothing until asked. */
function held(): { slicer: Slicer; runAll: () => void } {
  const jobs: (() => void)[] = [];
  const slicer: Slicer = { add: (_k, _p, run) => void jobs.push(run),
    clear: () => undefined, busy: () => jobs.length > 0 };
  return { slicer, runAll: () => { while (jobs.length) jobs.shift()?.(); } };
}

describe('the rocks switch', () => {
  it('draws the scans by default and the stones only when asked', () => {
    expect(parseRockLook('')).toBe('scan');
    expect(parseRockLook('?rocks=lava')).toBe('scan');
    expect(parseRockLook('?rocks=STONES')).toBe('stones');
  });

  it('draws scans only where the tier keeps rocks', () => {
    expect(scansDrawn(420, 'scan')).toBe(true);
    expect(scansDrawn(0, 'scan')).toBe(false);
    expect(scansDrawn(420, 'stones')).toBe(false);
  });

  it('is named in the debug switches line and kept by the language switch', () => {
    expect(switchLine('?rocks=stones')).toBe('switches: rocks=stones');
    expect(switchLine('?rocks=scan')).toBe('switches: none');
    expect(localeHref('/', 'es', { search: '?site=im2-athena&rocks=stones', hash: '#horizon' }))
      .toBe('/es/?site=im2-athena&rocks=stones#horizon');
  });
});

describe('the caption credit', () => {
  const t = EN;
  it('names the rocks only when the scans are drawn', () => {
    expect(captionNote(t, false, true)).toBe(
      'Rocks: NASA Astromaterials 3D (Apollo 17) · Earth: NASA Blue Marble · shadows lifted and exposure raised 20 % for legibility');
    expect(captionNote(t, true, true)).toMatch(/^Rocks: NASA Astromaterials 3D \(Apollo 17\) · Earth: .* light added/);
    expect(captionNote(t)).not.toMatch(/Rocks/);
  });
});

describe('splitNearest', () => {
  it('takes the nearest within reach, at most SCAN_COUNT', () => {
    const rocks = Array.from({ length: 200 }, (_, i) =>
      rock((i % 20) - 10 + 0.5, Math.floor(i / 20) * 3 - 14));
    const { near, rest } = splitNearest(rocks, [0, 0]);
    expect(near.length).toBe(SCAN_COUNT);
    expect(near.length + rest.length).toBe(rocks.length);
    const away = (r: Rock) => Math.hypot(r.east, r.north);
    expect(near.every((r) => away(r) <= SCAN_REACH_M)).toBe(true);
    const farthestNear = Math.max(...near.map(away));
    expect(rest.filter((r) => away(r) < farthestNear)).toEqual([]);
  });

  it('measures from the eye, not the point', () => {
    const { near } = splitNearest([rock(0, 0), rock(100, 0)], [100, 0]);
    expect(near.map((r) => r.east)).toEqual([100]);
  });
});

describe('shapeIndex and scanPose', () => {
  it('picks a shape in range, the same every time', () => {
    const r = rock(3.1, -2.7);
    expect(shapeIndex(r, 4)).toBe(shapeIndex(r, 4));
    for (let i = 0; i < 50; i++) {
      const k = shapeIndex(rock(i * 0.37, i * -1.3), 4);
      expect(k >= 0 && k < 4).toBe(true);
    }
  });

  it('stands the scan where the stone stood, as tall and as sunk', () => {
    const r = { ...rock(2, 5, 0.4), lift: 0.5 };
    const pose = scanPose(r, () => 1.5, 0.6);
    expect(pose.position).toEqual([2, 1.5 + 0.4 * 0.6 * 0.5, -5]);
    expect(pose.scale[1] * 0.6).toBeCloseTo(0.4 * 0.6);
    expect(pose.scale[0]).toBeCloseTo(0.46);
    expect(pose.turnY).toBe(-r.yawRad);
  });
});

describe('the committed scans', () => {
  it('reads four shapes of about 1,500 triangles with valid indices', () => {
    const file = readFileSync(new URL('on-foot-rocks.bin', MAPS));
    const buffer = file.buffer.slice(file.byteOffset,
      file.byteOffset + file.byteLength);
    const shapes = readScanShapes(buffer);
    expect(shapes).toHaveLength(SAMPLES.length);
    for (const shape of shapes) {
      const vertices = shape.positions.length / 3;
      expect(shape.index.length / 3).toBeLessThanOrEqual(1500);
      expect(shape.index.length / 3).toBeGreaterThan(1200);
      expect(Math.max(...shape.index)).toBeLessThan(vertices);
      expect(shape.halfHeight).toBeLessThanOrEqual(shape.halfDepth);
      expect(shape.halfDepth).toBeLessThanOrEqual(1);
    }
  });

  it('refuses a file that is not the scans', () => {
    expect(() => readScanShapes(new ArrayBuffer(16))).toThrow();
  });

  it('keeps every rock asset under 300 kB together', () => {
    const files = ['on-foot-rocks.bin',
      ...SAMPLES.map((id) => `on-foot-rock-${id}.webp`)];
    const bytes = files.reduce((n, f) => n + statSync(new URL(f, MAPS)).size, 0);
    expect(bytes).toBeLessThan(300_000);
  });
});

describe('rocksMesh with scans', () => {
  const never = new Promise<ScanAssets>(() => undefined);
  const flat = () => 0;
  const stoneVertices = (scan: boolean): number => {
    const { slicer, runAll } = held();
    const mesh = rocksMesh(7, flat, createSunMask(), { slicer, law: MEASURED,
      scan: scan ? { look: 'scan', assets: never } : null });
    runAll();
    return mesh.geometry.getAttribute('position').count;
  };

  it('builds every rock but the nearest as stones', () => {
    const bands = measuredBands(7, flat);
    const all = Array.from({ length: bands.count }, (_, i) => bands.band(i)).flat();
    const scanned = splitNearest(all, [0, 0]).near.length;
    expect(scanned).toBeGreaterThan(0);
    const perStone = stoneVertices(false) / all.length;
    expect(stoneVertices(true)).toBe(perStone * (all.length - scanned));
  });

  it('scatters on the ground it is given and stands each rock on `stand`', () => {
    const { slicer, runAll } = held();
    const plain = rocksMesh(7, flat, createSunMask(), { slicer, law: MEASURED });
    const raised = rocksMesh(7, flat, createSunMask(), { slicer, law: MEASURED, stand: () => 0.5 });
    runAll();
    const a = plain.geometry.getAttribute('position').array;
    const b = raised.geometry.getAttribute('position').array;
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i += 3) {
      expect(b[i]).toBe(a[i]);
      expect(b[i + 1]).toBeCloseTo((a[i + 1] ?? 0) + 0.5, 5);
      expect(b[i + 2]).toBe(a[i + 2]);
    }
  });
});

/** IM-2's recorded relief, its frame and its near grid. */
function im2() {
  const store = new RingStore('polar-south');
  for (const file of readdirSync(FIXTURES)) {
    const m = /^tile-polar-south-(\d+)-(\d+)-(\d+)\.json$/.exec(file);
    if (!m) continue;
    const key = { level: Number(m[1]), x: Number(m[2]), y: Number(m[3]), url: '' };
    const tile = parseTile(JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8')) as unknown, key, 'polar-south');
    if (tile) store.add(tile);
  }
  const frame = frameAt(IM2, heightAtDir(store, { from: 0, levels: 4 }, unitOf(IM2.lat, IM2.lonEast)));
  const ys = new Float32Array(LOCAL_N * LOCAL_N);
  fillRows(ys, { store, frame, reach: { from: 0, levels: 4 } }, localSize(0), [0, LOCAL_N]);
  const tile = { key: 'near', originEast: 0, originNorth: 0, n: LOCAL_N, sizeM: localSize(0), heights: ys, resolutionM: 15.6 };
  return { store, frame, near: (e: number, n: number) => surfaceHeight(tile, ys, e, n) };
}

/** The height the level 0 mesh draws at `east`, `north`, by brute force over its strided cells (ring-mesh.ts). */
function meshHeight(store: RingStore, frame: Frame, stride: number, [east, north]: [number, number]): number {
  const [x, z] = [east, -north];
  for (const t of store.tiles.values()) {
    if (t.key.level !== 0) continue;
    const p = gridPositions(t, frame);
    const at = (r: number, c: number): number[] => [p[(r * N + c) * 3] ?? 0, p[(r * N + c) * 3 + 1] ?? 0, p[(r * N + c) * 3 + 2] ?? 0];
    for (let r = 0; r + stride < N; r += stride) {
      for (let c = 0; c + stride < N; c += stride) {
        const [a, b, cc, d] = [at(r, c), at(r, c + stride), at(r + stride, c), at(r + stride, c + stride)];
        for (const tri of [[a, b, cc], [b, cc, d]]) {
          const [A = [], B = [], C = []] = tri;
          const [ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, cx = 0, cy = 0, cz = 0] = [...A, ...B, ...C];
          const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
          const u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / det;
          const v = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / det;
          if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) return ay + u * (by - ay) + v * (cy - ay);
        }
      }
    }
  }
  return Number.NaN;
}

describe('the ground the rocks stand on, on IM-2\'s recorded relief', () => {
  const { store, frame, near } = im2();
  const spots: [number, number][] = [[0, 0], [3.3, -7.1], [-11.2, 4.4], [8.8, 9.9], [-5.5, -12.7], [14.1, 1.2]];

  it.each([1, 2])('reads the drawn level 0 mesh at stride %i', (stride) => {
    const drawn = drawnGround({ store, frame }, stride, () => Number.NaN);
    for (const spot of spots) {
      expect(drawn(...spot)).toBeCloseTo(meshHeight(store, frame, stride, spot), 4);
    }
  });

  it('is not the near grid at the medium tier: rocks placed on it were buried', () => {
    const drawn = drawnGround({ store, frame }, 2, near);
    let deepest = 0;
    for (let e = -15; e <= 15; e += 1.5) {
      for (let n = -15; n <= 15; n += 1.5) {
        if (Math.hypot(e, n) <= 15) deepest = Math.min(deepest, near(e, n) - drawn(e, n));
      }
    }
    expect(deepest).toBeLessThan(-0.15);
  });

  it('falls back to the near grid where level 0 is not loaded', () => {
    const empty = new RingStore('polar-south');
    expect(drawnGround({ store: empty, frame }, 2, () => 7)(1, 2)).toBe(7);
  });

  it('stands the medium tier\'s rocks on the drawn ground and scatters them on the near grid', () => {
    const ring = { store, frame, tier: { levels: 4, strides: [2, 1, 1, 1] } } as unknown as Parameters<typeof rockGrounds>[0];
    const { scatter, stand } = rockGrounds(ring, { ground: near, craters: null, patchM: 0 });
    const drawn = drawnGround({ store, frame }, 2, near);
    for (const spot of spots) {
      expect(scatter(...spot)).toBe(near(...spot));
      expect(stand(...spot)).toBe(drawn(...spot));
    }
  });
});
