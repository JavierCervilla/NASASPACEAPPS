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
 * The relief rings (VENT-46): decode, placement against `sampleDirection`
 * and the curvature, which tiles a level draws where (windows, holes the
 * parent fills), skirts, seams without creases, the tier's rings, the
 * fetch (6 in flight, retries, a missing tile a hole) and the work slicer.
 */
import {
  TILE_CELLS, encodeQuantised, quantiseHeights, sampleDirection, tileGeoref,
  type TileKey,
} from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import { NoTerrainHereError } from '../src/horizon/horizon-errors';
import { HORIZON_RETRY } from '../src/horizon/horizon-retry';
import { parseRing, parseTile } from '../src/terrain/ring/ring-answer';
import { cellOf, tileOfCell } from '../src/terrain/ring/ring-cells';
import { fetchRingSource, IN_FLIGHT } from '../src/terrain/ring/ring-fetch';
import { frameAt, fromLocal, toLocal, unitOf } from '../src/terrain/ring/ring-frame';
import { gridPositions } from '../src/terrain/ring/ring-grid';
import { latticeOf } from '../src/terrain/ring/ring-lattice';
import { drawn } from '../src/terrain/ring/ring-layout';
import { buildMesh } from '../src/terrain/ring/ring-mesh';
import { gridNormals } from '../src/terrain/ring/ring-normals';
import { backdropM, ringTier } from '../src/terrain/ring/ring-plan';
import { RingStore, type RingTile } from '../src/terrain/ring/ring-store';
import { touches, windowsFor } from '../src/terrain/ring/ring-window';
import { createSlicer } from '../src/terrain/scene/slicer';

const SITE = { lat: -84.79, lonEast: 29.2 };
const R = 1_737_400;
const N = TILE_CELLS + 1;

/** A tile of the south polar plane whose height is `f(plane x, y)`. */
function tileOf(level: number, x: number, y: number, f: (px: number, py: number) => number): RingTile {
  const key: TileKey = { scheme: 'polar-south', level, x, y };
  const g = tileGeoref(key) as { minX: number; maxY: number; spacingM: number };
  const heights = new Float32Array(N * N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) heights[r * N + c] = f(g.minX + c * g.spacingM, g.maxY - r * g.spacingM);
  }
  return { key, n: N, heights, resolutionM: 20 };
}

/** The tile of `level` that holds the site. */
function siteTile(level: number): { x: number; y: number } {
  const [fx, fy] = latticeOf('polar-south', level, unitOf(SITE.lat, SITE.lonEast));
  return { x: Math.floor(fx / TILE_CELLS), y: Math.floor(fy / TILE_CELLS) };
}

/** Every tile a level's window touches, loaded flat. */
function storeWith(levels: number[], f: (px: number, py: number) => number = () => 0): { store: RingStore; windows: ReturnType<typeof windowsFor> } {
  const store = new RingStore('polar-south');
  const windows = windowsFor('polar-south', unitOf(SITE.lat, SITE.lonEast), 4);
  for (const level of levels) {
    const { x, y } = siteTile(level);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const w = windows[level];
        if (w && touches(w, x + dx, y + dy)) store.add(tileOf(level, x + dx, y + dy, f));
      }
    }
  }
  return { store, windows };
}

describe('decoding a tile', () => {
  const entry = { level: 0, x: 3, y: -2, url: '/u' };
  const body = (heights: Float32Array) => {
    const q = quantiseHeights(heights);
    return { n: N, quantumM: q.quantumM, baseUnits: q.baseUnits, heights: encodeQuantised(q), resolutionM: 20 };
  };

  it('reads uint16 heights as metres over the sphere, NaN where no tier covers', () => {
    const heights = new Float32Array(N * N).fill(-3_000.4);
    heights[7] = Number.NaN;
    const tile = parseTile(body(heights), entry, 'polar-south');
    expect(tile?.key).toEqual({ scheme: 'polar-south', level: 0, x: 3, y: -2 });
    expect(tile?.heights[0]).toBeCloseTo(-3_000.4, 1);
    expect(tile?.heights[7]).toBeNaN();
  });

  it('refuses a body that is not a tile, and a list that is not a ring', () => {
    expect(parseTile({ ...body(new Float32Array(N * N)), n: 65 }, entry, 'polar-south')).toBeNull();
    expect(parseTile({ n: N, heights: '!!', quantumM: 0.1, baseUnits: 0, resolutionM: 1 }, entry, 'polar-south')).toBeNull();
    expect(parseRing({ scheme: 'moon', levels: [] })).toBeNull();
    const ring = parseRing({ scheme: 'polar-south', levels: [{ level: 1, tiles: [{ x: 1, y: 2, url: '/a' }] }] });
    expect(ring?.entries).toEqual([{ level: 1, x: 1, y: 2, url: '/a' }]);
  });
});

describe('placing a node in the session frame', () => {
  it('puts every node where sampleDirection says, at its height, the site at the origin', () => {
    const { x, y } = siteTile(0);
    const tile = tileOf(0, x, y, () => 120);
    const frame = frameAt(SITE, 120);
    const at = gridPositions(tile, frame);
    const georef = tileGeoref(tile.key);
    for (const [r, c] of [[0, 0], [64, 64], [128, 3]] as const) {
      expect([...at.subarray((r * N + c) * 3, (r * N + c) * 3 + 3)]).toEqual(
        toLocal(frame, sampleDirection(georef, r, c), 120).map(Math.fround));
    }
    const origin = toLocal(frame, unitOf(SITE.lat, SITE.lonEast), 120);
    expect(Math.hypot(...origin)).toBeLessThan(1e-3);
  });

  it('lowers the ground by the curvature, d squared over 2R', () => {
    const frame = frameAt(SITE, 0);
    const d = 2_000;
    const [east, up, south] = toLocal(frame, fromLocal(frame, d, 0, 0), 0);
    expect(east).toBeCloseTo(d, 3);
    expect(south).toBeCloseTo(0, 3);
    expect(up).toBeCloseTo(-(d * d) / (2 * R), 2);
    const far = toLocal(frame, fromLocal(frame, 0, 128_000, 0), 0);
    expect(far[1]).toBeCloseTo(-(R - Math.sqrt(R * R - 128_000 ** 2)), 2);
    expect(far[2]).toBeCloseTo(-128_000, 2);
  });

  it('keeps the cell and the tile that holds it in step', () => {
    const { key, row, col } = tileOfCell('polar-south', 2, -130, 260);
    expect(key).toEqual({ scheme: 'polar-south', level: 2, x: -2, y: 2 });
    expect(cellOf(key, row, col)).toEqual([-130, 260]);
  });
});

describe('what each level draws', () => {
  it('draws a coarse cell only where no loaded finer tile covers it, and fills a missing one', () => {
    const { store, windows } = storeWith([0, 1]);
    const layout = { store, windows };
    const [fx, fy] = latticeOf('polar-south', 1, unitOf(SITE.lat, SITE.lonEast));
    const [cx, cy] = [Math.floor(fx), Math.floor(fy)];
    expect(drawn(layout, 1, cx, cy)).toBe(false);
    expect(drawn(layout, 0, cx * 4, cy * 4)).toBe(true);
    const edge = windows[0] as unknown as { lo: number[]; hi: number[] };
    expect(drawn(layout, 1, edge.hi[0] as number, cy)).toBe(true);
    const missing = siteTile(0);
    store.tiles.delete(`polar-south/0/${missing.x}/${missing.y}`);
    expect(drawn(layout, 1, cx, cy)).toBe(true);
    expect(drawn(layout, 0, cx * 4, cy * 4)).toBe(false);
  });

  it('puts the windows 4, 16, 64 and 256 km across, aligned to the parent', () => {
    const windows = windowsFor('polar-south', unitOf(SITE.lat, SITE.lonEast), 4);
    const cells = windows.map((w) => ((w.hi[0] - w.lo[0]) * w.step));
    expect(cells).toEqual([256, 256, 256, 256]);
    for (const w of windows.slice(0, 3)) expect(w.step).toBe(4);
  });
});

describe('the triangles of a tile', () => {
  it('draws only its window, hangs skirts on every open side and leaves none inside', () => {
    const { store, windows } = storeWith([0]);
    const { x, y } = siteTile(0);
    const tile = store.get(0, x, y) as RingTile;
    const frame = frameAt(SITE, 0);
    const positions = gridPositions(tile, frame);
    const normals = gridNormals(tile, positions, { store, frame, window: windows[0], blends: false });
    const spec = { tile, layout: { store, windows }, valid: new Uint8Array(TILE_CELLS * TILE_CELLS).fill(1), up: true, stride: 1, skirtM: 40 };
    const mesh = buildMesh(spec, { positions, normals });
    const skirtVertices = mesh.positions.length / 3 - N * N;
    expect(skirtVertices).toBeGreaterThan(0);
    expect(skirtVertices % 2).toBe(0);
    for (let i = N * N; i < mesh.positions.length / 3; i += 2) {
      // The ground is flat at 0 m over 4 km: its fall is under 3 m, the skirt 40 m under it.
      expect(mesh.positions[i * 3 + 1]).toBeLessThan(-37);
      expect(mesh.positions[i * 3 + 1]).toBeGreaterThan(-45);
    }
    const strided = buildMesh({ ...spec, stride: 2 }, { positions, normals });
    expect(strided.index.length).toBeLessThan(mesh.index.length);
    expect(Math.max(...mesh.index)).toBeLessThan(mesh.positions.length / 3);
  });
});

describe('a seam between tiles of a level', () => {
  it('has the same normal on both sides of a tilted surface', () => {
    const tilt = (px: number, py: number): number => 0.2 * px - 0.1 * py + 30 * Math.sin(px / 900);
    const { store, windows } = storeWith([0], tilt);
    const { x, y } = siteTile(0);
    const frame = frameAt(SITE, 0);
    const [a, b] = [store.get(0, x, y), store.get(0, x + 1, y)] as RingTile[];
    const context = { store, frame, window: windows[0], blends: false };
    const na = gridNormals(a as RingTile, gridPositions(a as RingTile, frame), context);
    const nb = gridNormals(b as RingTile, gridPositions(b as RingTile, frame), context);
    for (const row of [0, 40, 128]) {
      const left = [...na.subarray((row * N + 128) * 3, (row * N + 128) * 3 + 3)];
      const right = [...nb.subarray(row * N * 3, row * N * 3 + 3)];
      left.forEach((v, i) => expect(v).toBeCloseTo(right[i] as number, 5));
    }
  });
});

describe('the rings a tier draws', () => {
  it('draws 4 levels on high, the first at every node, and drops detail on phones', () => {
    expect(ringTier('high')).toEqual({ levels: 4, strides: [1, 1, 1, 1] });
    expect(ringTier('medium').strides[0]).toBe(2);
    expect(ringTier('low').levels).toBe(3);
    expect(backdropM(ringTier('high'))).toBeGreaterThan(181_000);
    expect(backdropM(ringTier('low'))).toBeLessThan(backdropM(ringTier('high')));
  });

  it('keeps the budget: at most 4 x 131 k triangles on high', () => {
    const cellsPerLevel = 256 * 256;
    const triangles = (ringTier('high').levels * cellsPerLevel * 2);
    expect(triangles).toBeLessThan(600_000);
    const phone = ringTier('low').strides.reduce((sum, s) => sum + (cellsPerLevel * 2) / (s * s), 0);
    expect(phone).toBeLessThan(triangles / 2);
  });
});

describe('fetching the ring', () => {
  const ring = {
    scheme: 'polar-south',
    levels: [{ level: 0, tiles: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 0, url: `/api/v1/terrain/tiles/polar-south/0/${i}/0?v=1` })) }],
  };
  const heights = new Float32Array(N * N).fill(5);
  const q = quantiseHeights(heights);
  const tileBody = { n: N, quantumM: q.quantumM, baseUnits: q.baseUnits, heights: encodeQuantised(q), resolutionM: 20 };
  const waits = { sleep: () => Promise.resolve(), random: () => 0.5 };
  const feedTo = (log: string[]) => ({
    scheme: () => log.push('scheme'),
    tile: (t: RingTile) => log.push(`tile${t.key.x}`),
    settled: (l: number) => log.push(`settled${l}`),
  });
  const request = { point: SITE, levels: 1, wanted: (_s: string, e: readonly { level: number; x: number; y: number; url: string }[]) => e };

  it('runs at most 6 tile requests at once and settles the level when the last is done', async () => {
    let running = 0;
    let peak = 0;
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(ring));
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((done) => setTimeout(done, 1));
      running -= 1;
      return new Response(JSON.stringify(tileBody));
    }) as unknown as typeof fetch;
    const log: string[] = [];
    await fetchRingSource(fetcher, 'https://x.test/api/v1/sites', waits).load(request, feedTo(log), new AbortController().signal);
    expect(peak).toBe(IN_FLIGHT);
    expect(log.filter((l) => l.startsWith('tile'))).toHaveLength(12);
    expect(log.at(-1)).toBe('settled0');
  });

  it('retries a busy server, and a tile that is a 404 is a hole, not a failure', async () => {
    let busy = 1;
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(ring));
      if (url.includes('/0/3/')) return new Response('{}', { status: 404 });
      if (busy-- > 0) return new Response('{}', { status: 503, headers: { 'retry-after': '0' } });
      return new Response(JSON.stringify(tileBody));
    }) as unknown as typeof fetch;
    const log: string[] = [];
    await fetchRingSource(fetcher, 'https://x.test/api/v1/sites', waits).load(request, feedTo(log), new AbortController().signal);
    expect(log.filter((l) => l.startsWith('tile'))).toHaveLength(11);
    expect(log).not.toContain('tile3');
    expect(log.at(-1)).toBe('settled0');
  });

  it('rejects as no terrain when every tile of the near levels is a 404, and stops asking the coarse ones', async () => {
    const urls: string[] = [];
    const two = { scheme: 'polar-south', levels: [0, 1, 2].map((level) => ({ level, tiles: Array.from({ length: 8 }, (_, i) => ({ x: i, y: 0, url: `/api/v1/terrain/tiles/polar-south/${level}/${i}/0?v=1` })) })) };
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(two));
      urls.push(url);
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
    const log: string[] = [];
    await expect(fetchRingSource(fetcher, 'https://x.test/api/v1/sites', waits)
      .load({ ...request, levels: 3 }, feedTo(log), new AbortController().signal)).rejects.toBeInstanceOf(NoTerrainHereError);
    expect(urls.length).toBeLessThan(24);
    expect(urls.filter((u) => u.includes('/polar-south/2/')).length).toBeLessThan(IN_FLIGHT);
    expect(log).not.toContain('settled1');
  });

  // Verificador round 2 on PR #32: a near level that only ever answered passing failures is not «no terrain».
  it('keeps the near tiles as holes, not «no terrain», when they are busy until their tries run out', async () => {
    const asked = new Map<string, number>();
    const three = { scheme: 'polar-south', levels: [0, 1, 2].map((level) => ({ level, tiles: Array.from({ length: 4 }, (_, i) => ({ x: i, y: 0, url: `/api/v1/terrain/tiles/polar-south/${level}/${i}/0?v=1` })) })) };
    let busy = true;
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(three));
      asked.set(url, (asked.get(url) ?? 0) + 1);
      const near = /\/polar-south\/[01]\//.test(url);
      if (near && busy) return new Response(JSON.stringify({ error: 'busy' }), { status: 503 });
      return new Response(JSON.stringify(tileBody));
    }) as unknown as typeof fetch;
    const source = fetchRingSource(fetcher, 'https://x.test/api/v1/sites', waits);
    const log: string[] = [];
    await expect(source.load({ ...request, levels: 3 }, feedTo(log), new AbortController().signal)).resolves.toBeUndefined();
    const nearUrls = [...asked.keys()].filter((u) => /\/polar-south\/[01]\//.test(u));
    expect(nearUrls).toHaveLength(8);
    for (const u of nearUrls) expect(asked.get(u)).toBe(HORIZON_RETRY.delaysMs.length + 1);
    expect(log.filter((l) => l.startsWith('tile'))).toHaveLength(4);
    expect(log).toEqual(expect.arrayContaining(['settled0', 'settled1', 'settled2']));
    // The holes stay retryable: the same source asked again once the server is free feeds every near tile.
    busy = false;
    const again: string[] = [];
    await source.load({ ...request, levels: 3 }, feedTo(again), new AbortController().signal);
    expect(again.filter((l) => l.startsWith('tile'))).toHaveLength(12);
  });

  it('keeps a hole as a hole when a near tile is missing but another came', async () => {
    const one = { scheme: 'polar-south', levels: [{ level: 0, tiles: [0, 1].map((i) => ({ x: i, y: 0, url: `/api/v1/terrain/tiles/polar-south/0/${i}/0?v=1` })) }] };
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(one));
      return url.includes('/0/0/') ? new Response('{}', { status: 404 }) : new Response(JSON.stringify(tileBody));
    }) as unknown as typeof fetch;
    const log: string[] = [];
    await fetchRingSource(fetcher, 'https://x.test/api/v1/sites', waits).load(request, feedTo(log), new AbortController().signal);
    expect(log.filter((l) => l.startsWith('tile'))).toHaveLength(1);
  });

  it('rejects when the route itself says there is no terrain', async () => {
    const fetcher = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;
    await expect(fetchRingSource(fetcher, 'https://x.test/api/v1/sites', waits)
      .load(request, feedTo([]), new AbortController().signal)).rejects.toThrow();
  });
});

describe('the work slicer', () => {
  /** A slicer on a fake clock: each job costs `cost` ms, a turn waits to be run. */
  function rig(cost: number, budgetMs = 12, frameGapMs = 0) {
    let now = 0;
    const turns: (() => void)[] = [];
    const frames = { n: 0 };
    const slicer = createSlicer({ invalidate: () => void (frames.n += 1), now: () => now, budgetMs, frameGapMs,
      schedule: (fn) => turns.push(fn), cancel: () => turns.splice(0) });
    const order: string[] = [];
    const job = (name: string) => () => { now += cost; order.push(name); };
    return { slicer, turns, order, job, frames };
  }

  it('runs the lowest priority first, a turn at a time within its budget, never in the caller’s turn', () => {
    const { slicer, turns, order, job } = rig(7);
    slicer.add('far', 3, job('far'));
    slicer.add('near', 0, job('near'));
    slicer.add('mid', 1, job('mid'));
    expect(order).toEqual([]);
    turns.shift()?.();
    expect(order).toEqual(['near', 'mid']);
    turns.shift()?.();
    expect(order).toEqual(['near', 'mid', 'far']);
  });

  it('replaces a waiting job of the same name and asks for a frame once its work is done', () => {
    const { slicer, turns, order, job, frames } = rig(1);
    slicer.add('tile', 0, job('old'));
    slicer.add('tile', 0, job('new'));
    turns.shift()?.();
    expect(order).toEqual(['new']);
    expect(frames.n).toBe(1);
  });

  it('asks for one frame per gap while work waits, and always when the last job is done', () => {
    const { slicer, turns, order, job, frames } = rig(10, 10, 30);
    for (let i = 0; i < 12; i++) slicer.add(`t${i}`, 0, job(`t${i}`));
    turns.shift()?.();
    expect(frames.n).toBe(1);
    for (let turn = 0; turn < 4; turn++) turns.shift()?.();
    expect(frames.n).toBe(2);
    while (turns.length > 0) turns.shift()?.();
    expect(order).toHaveLength(12);
    expect(frames.n).toBe(5);
  });

  it('lets quiet jobs ask no frame while work waits, only when the queue runs out', () => {
    const { slicer, turns, order, job, frames } = rig(10, 10, 30);
    for (let i = 0; i < 12; i++) slicer.add(`q${i}`, 0, job(`q${i}`), true);
    for (let turn = 0; turn < 11; turn++) turns.shift()?.();
    expect(order).toHaveLength(11);
    expect(frames.n).toBe(0);
    turns.shift()?.();
    expect(order).toHaveLength(12);
    expect(frames.n).toBe(1);
  });

  it('forgets everything on clear', () => {
    const { slicer, turns, order, job } = rig(1);
    slicer.add('a', 0, job('a'));
    slicer.clear();
    turns.shift()?.();
    expect(order).toEqual([]);
  });
});
