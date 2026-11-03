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
 * The on-foot view's loader, B→A (VENT-60, the human's verdict on the canvas): how the ring's tiles come (the
 * progress model and the session that feeds it), the loader's phases and words, the plan's geometry (where each tile
 * lies, the rim's azimuths, the field's wedge), each tile's shading from its own heights, the closing skyline drawn
 * with the scene's own camera (held to three's PerspectiveCamera), the seeded stars, and the one choice point of the
 * loader's picture. IM-2 on 22 November 2026 at 20:00 UTC: the Sun 6.7° up at 350°, the Earth 10.2° up at 325°.
 */
import {
  TILE_CELLS, horizonAt, planePoint, skyAt, tileContaining, tileGeoref, type TileKey,
} from '@ventana/sim';
import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createProgressStore } from '../src/terrain/ring/progress-store';
import { NOT_LISTED, land, listed, settle, tally } from '../src/terrain/ring/ring-progress';
import { runRing } from '../src/terrain/ring/ring-session';
import { ringTier } from '../src/terrain/ring/ring-plan';
import type { RingFeed, RingRequest, RingSource } from '../src/terrain/ring/ring-source';
import type { RingTile } from '../src/terrain/ring/ring-store';
import { frameAt } from '../src/terrain/ring/ring-frame';
import { cameraPose, startLook } from '../src/terrain/view-camera';
import { startYaw } from '../src/terrain/on-foot-model';
import { farTally, loaderPhase, nearIn } from '../src/terrain/loader/loader-phase';
import { farWords, loaderWords, ringLabel } from '../src/terrain/loader/loader-words';
import { planLayout, rimAt, tileCorners, tileMatrix } from '../src/terrain/loader/plan-geometry';
import { shadeTile, tileAxes } from '../src/terrain/loader/hillshade';
import { bodyPlace, halfFieldDeg, loaderCamera, project, skylinePoints } from '../src/terrain/loader/skyline-camera';
import { seededStars } from '../src/terrain/loader/loader-stars';
import { loaderPicture } from '../src/terrain/loader/loader-picture';
import { shippedTerrain } from '../src/source/terrain-profiles';
import { EN, i18nOf } from './i18n-factories';

const IM2 = { lat: -84.7906, lonEast: 29.1957 };
const AT = Date.parse('2026-11-22T20:00:00Z');
const SKY = skyAt({ latDeg: IM2.lat, lonEastDeg: IM2.lonEast }, AT);
const YAW = startYaw(SKY);
const N = TILE_CELLS + 1;
const key = (level: number, x: number, y: number): TileKey => ({ scheme: 'polar-south', level, x, y });
const flat = (k: TileKey, h = 0): RingTile => ({ key: k, n: N, heights: new Float32Array(N * N).fill(h), resolutionM: 20 });
const place = (level: number, x: number, y: number) => ({ level, x, y, url: `/t/${level}/${x}/${y}` });

describe('how the ring\'s tiles come', () => {
  const wanted = [place(0, 1, 1), place(0, 2, 1), place(1, 0, 0), place(2, 0, 0)];

  it('lists the wanted tiles waiting, lands them in the order they come and counts by level', () => {
    let p = listed('polar-south', wanted);
    expect(p.scheme).toBe('polar-south');
    expect(tally(p, 0, 2)).toEqual({ done: 0, total: 3 });
    p = land(p, flat(key(1, 0, 0)));
    p = land(p, flat(key(0, 2, 1)));
    expect(p.tiles.map((t) => [t.fate, t.order])).toEqual([['waiting', 0], ['landed', 2], ['landed', 1], ['waiting', 0]]);
    expect(p.tiles[1]?.tile?.key).toEqual(key(0, 2, 1));
    expect(tally(p, 0, 2)).toEqual({ done: 2, total: 3 });
    expect(tally(p, 2, 4)).toEqual({ done: 0, total: 1 });
  });

  it('marks a level\'s waiting tiles missed when it settles, which still counts them as done', () => {
    let p = land(listed('polar-south', wanted), flat(key(0, 1, 1)));
    p = settle(p, 0);
    expect(p.tiles.map((t) => t.fate)).toEqual(['landed', 'missed', 'waiting', 'waiting']);
    expect(tally(p, 0, 2)).toEqual({ done: 2, total: 3 });
    expect(settle(p, 0)).toBe(p);
  });

  it('ignores a tile it was not waiting for, and a tile that lands twice', () => {
    const p = land(listed('polar-south', wanted), flat(key(0, 1, 1)));
    expect(land(p, flat(key(3, 9, 9)))).toBe(p);
    expect(land(p, flat(key(0, 1, 1)))).toBe(p);
  });

  it('starts before the list, and its store tells each change once', () => {
    const store = createProgressStore();
    expect(store.get()).toBe(NOT_LISTED);
    let heard = 0;
    const off = store.subscribe(() => (heard += 1));
    store.update((p) => p);
    store.update(() => listed('polar-south', wanted));
    off();
    store.update(() => NOT_LISTED);
    expect(heard).toBe(1);
  });

  it('is fed by the ring session: the list, then each tile as it lands, then the missed when its level settles', async () => {
    const store = createProgressStore();
    const site = tileContaining('polar-south', 0, IM2.lat, IM2.lonEast);
    const entries = [place(0, site.x, site.y), place(0, site.x + 1, site.y), place(0, site.x - 1, site.y), place(0, site.x + 40, site.y)];
    const seen: string[] = [];
    const source: RingSource = {
      load: async (request: RingRequest, feed: RingFeed) => {
        feed.scheme('polar-south');
        const kept = request.wanted('polar-south', entries);
        seen.push(`listed ${store.get().tiles.length}`);
        feed.tile(flat(key(0, site.x + 1, site.y), 10));
        seen.push(`landed ${store.get().landed}`);
        feed.tile(flat(key(0, site.x, site.y), 10));
        feed.settled(0);
        feed.settled(1);
        expect(kept).toHaveLength(3);
      },
    };
    const run = { source, point: { lat: IM2.lat, lonEast: IM2.lonEast }, tier: { levels: 2, strides: [1, 1] },
      breathe: () => Promise.resolve(), signal: new AbortController().signal, progress: store };
    await runRing(run, () => undefined);
    expect(seen).toEqual(['listed 3', 'landed 1']);
    expect(store.get().tiles.map((t) => [t.fate, t.order])).toEqual([['landed', 2], ['landed', 1], ['missed', 0]]);
  });

  it('is not told anything by a run that was left', async () => {
    const store = createProgressStore();
    const abort = new AbortController();
    const source: RingSource = {
      load: async (request: RingRequest, feed: RingFeed) => {
        abort.abort();
        feed.scheme('polar-south');
        request.wanted('polar-south', [place(0, 0, 0)]);
      },
    };
    const run = { source, point: IM2, tier: ringTier('high'), breathe: () => Promise.resolve(), signal: abort.signal,
      progress: store };
    await runRing(run, () => undefined);
    expect(store.get()).toBe(NOT_LISTED);
  });
});

describe('the loader\'s phases', () => {
  const p = listed('polar-south', [place(0, 0, 0), place(1, 0, 0), place(2, 0, 0)]);
  const near = land(land(p, flat(key(0, 0, 0))), flat(key(1, 0, 0)));

  it('goes list, near, shaping, then hands over when the scene drew', () => {
    expect(loaderPhase({ progress: NOT_LISTED, ready: false, drawn: false })).toBe('list');
    expect(loaderPhase({ progress: p, ready: false, drawn: false })).toBe('near');
    expect(loaderPhase({ progress: near, ready: false, drawn: false })).toBe('shaping');
    expect(loaderPhase({ progress: p, ready: true, drawn: false })).toBe('shaping');
    expect(loaderPhase({ progress: near, ready: true, drawn: true })).toBe('handover');
  });

  it('holds the near tiles in once both near levels came or failed for good', () => {
    expect(nearIn(p)).toBe(false);
    expect(nearIn(land(p, flat(key(0, 0, 0))))).toBe(false);
    expect(nearIn(settle(land(p, flat(key(0, 0, 0))), 1))).toBe(true);
    expect(nearIn(NOT_LISTED)).toBe(false);
  });

  it('counts the far tiles, none when the view asks for no far level', () => {
    expect(farTally(near)).toEqual({ done: 0, total: 1 });
    expect(farTally(listed('polar-south', [place(0, 0, 0)]))).toBeNull();
  });
});

describe('the loader\'s words', () => {
  const eighteen = listed('polar-south', Array.from({ length: 18 }, (_, i) => place(i < 6 ? 0 : 1, i, 0)));
  const twelve = Array.from({ length: 12 }, (_, i) => i).reduce((q, i) => land(q, flat(key(i < 6 ? 0 : 1, i, 0))), eighteen);

  it('says what each phase does, as the canvas wrote it', () => {
    expect(loaderWords(EN, 'list', NOT_LISTED)).toEqual({ title: 'Finding the terrain tiles', note: 'LOLA relief around the point', bar: 0 });
    expect(loaderWords(EN, 'near', twelve)).toEqual({ title: 'Terrain · 12 of 18 tiles', note: 'Near relief · rings of 2 and 8 km', bar: 12 / 18 });
    expect(loaderWords(EN, 'shaping', twelve)).toEqual({ title: 'Shaping the ground', note: '18 of 18 tiles · building the 3D view', bar: 1 });
  });

  it('names the ring on the plan by its tiles and their nodes', () => {
    expect(ringLabel(EN, 0)).toBe('2 km tiles · 15.6 m');
    expect(ringLabel(EN, 1)).toBe('8 km tiles · 62.5 m');
    expect(ringLabel(i18nOf('es'), 1)).toBe('Teselas de 8 km · 62,5 m');
  });

  it('counts the far relief, then says which rings are in, in each language', () => {
    const far = listed('polar-south', [place(2, 0, 0), place(2, 1, 0), place(3, 0, 0)]);
    expect(farWords(EN, land(far, flat(key(2, 0, 0))))).toEqual({ title: 'Far relief', detail: '1 of 3 tiles' });
    const all = settle(settle(far, 2), 3);
    expect(farWords(EN, all)).toEqual({ title: 'Far relief', detail: '32 and 128 km in' });
    expect(farWords(i18nOf('es'), all)?.detail).toBe('32 y 128 km listos');
  });
});

describe('the plan from above', () => {
  const frame = frameAt(IM2, 0);
  const [XS, YS] = planePoint('south', IM2.lat, IM2.lonEast);

  it('lays the phone\'s and the desktop\'s scope as the canvas measured them, and a smaller one in a short band', () => {
    const phone = planLayout({ w: 390, h: 616 }, true);
    expect(phone.box).toBe(350);
    expect(phone.cy).toBeCloseTo(258.72, 2);
    expect(phone.pxPerM).toBeCloseTo((350 * 0.86) / 6000, 9);
    expect(phone.statusTop).toBe(Math.round(258.72 + 175 + 26));
    const half = planLayout({ w: 390, h: 258 }, true);
    expect(half.box).toBe(128);
    expect(half.cy - half.box / 2).toBeGreaterThan(20);
    expect(half.statusTop + 80).toBeLessThanOrEqual(258);
    const desk = planLayout({ w: 1056, h: 427.5 }, false);
    expect(desk.box).toBe(307.5);
    expect(desk.cy).toBeCloseTo(171.75, 2);
  });

  it('places each tile turned so the view\'s heading is up: the plane\'s corners, rotated by the heading plus the longitude', () => {
    const turn = ((YAW + IM2.lonEast) * Math.PI) / 180;
    for (const [level, dx, dy] of [[0, 0, 0], [0, 1, -1], [1, 0, 0]] as const) {
      const lsite = tileContaining('polar-south', level, IM2.lat, IM2.lonEast);
      const k = key(level, lsite.x + dx, lsite.y + dy);
      const g = tileGeoref(k) as { minX: number; maxY: number; spacingM: number };
      const corners = tileCorners(k, frame, YAW);
      const want = (col: number, row: number) => {
        const [x, y] = [g.minX + col * g.spacingM - XS, -(g.maxY - row * g.spacingM - YS)];
        return [x * Math.cos(turn) + y * Math.sin(turn), -x * Math.sin(turn) + y * Math.cos(turn)] as const;
      };
      for (const [got, [col, row]] of [[corners.origin, [0, 0]], [corners.col, [TILE_CELLS, 0]], [corners.row, [0, TILE_CELLS]]] as const) {
        const [wx, wy] = want(col, row);
        const off = Math.hypot(got[0] - wx, got[1] - wy);
        expect(off).toBeLessThan(5 + 0.01 * Math.hypot(wx, wy));
      }
    }
  });

  it('turns a tile\'s corners into the CSS matrix of a 128 px square', () => {
    const m = tileMatrix({ origin: [10, 20], col: [138, 20], row: [10, 84] }, 0.5);
    expect(m).toEqual([0.5, 0, 0, 0.25, 5, 10]);
  });

  it('puts the heading at the top of the rim and the Earth 25° to its left', () => {
    const [sx, sy] = rimAt(SKY.sunAz, YAW, 100);
    expect(sx).toBeCloseTo(0, 6);
    expect(sy).toBeCloseTo(-100, 6);
    const [ex, ey] = rimAt(SKY.earthAz, YAW, 100);
    expect(ex).toBeCloseTo(100 * Math.sin(((SKY.earthAz - YAW) * Math.PI) / 180), 6);
    expect(ex).toBeLessThan(-40);
    expect(ey).toBeLessThan(-80);
    const [nx] = rimAt(0, YAW, 100);
    expect(nx).toBeGreaterThan(0);
  });

  it('opens the field as wide as the scene\'s camera sees across', () => {
    expect(halfFieldDeg({ w: 390, h: 616 }, 62)).toBeCloseTo(20.83, 1);
    expect(halfFieldDeg({ w: 1056, h: 427.5 }, 50)).toBeCloseTo(49.0, 1);
  });
});

describe('a tile shaded from its own heights', () => {
  const site = tileContaining('polar-south', 0, IM2.lat, IM2.lonEast);
  const k = key(0, site.x, site.y);
  const axes = tileAxes(k, frameAt(IM2, 0));

  it('steps a cell along the plane: 15.6 m across and down at level 0', () => {
    expect(Math.hypot(...axes.col)).toBeCloseTo(15.6, 0);
    expect(Math.hypot(...axes.row)).toBeCloseTo(15.6, 0);
    expect((axes.col[0] * axes.row[0] + axes.col[1] * axes.row[1]) / (Math.hypot(...axes.col) * Math.hypot(...axes.row))).toBeCloseTo(0, 4);
  });

  it('lights flat ground as the canvas did, and a slope toward the Sun brighter than one away', () => {
    const px = shadeTile(flat(k), axes, SKY.sunAz);
    expect(px).toHaveLength(N * N * 4);
    expect(px[0]).toBe(145);
    expect(px[3]).toBe(255);
    const tilted = (sign: number): RingTile => {
      const heights = new Float32Array(N * N);
      const sun = [Math.sin((SKY.sunAz * Math.PI) / 180), Math.cos((SKY.sunAz * Math.PI) / 180)] as const;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const e = c * axes.col[0] + r * axes.row[0];
          const n = c * axes.col[1] + r * axes.row[1];
          heights[r * N + c] = sign * 0.2 * (e * sun[0] + n * sun[1]);
        }
      }
      return { ...flat(k), heights };
    };
    const centre = (64 * N + 64) * 4;
    const facing = shadeTile(tilted(-1), axes, SKY.sunAz)[centre] ?? 0;
    const away = shadeTile(tilted(1), axes, SKY.sunAz)[centre] ?? 0;
    expect(facing).toBeGreaterThan(200);
    expect(away).toBeLessThan(100);
  });

  it('leaves a node with no data clear', () => {
    const t = flat(k);
    t.heights[5] = Number.NaN;
    expect(shadeTile(t, axes, SKY.sunAz)[5 * 4 + 3]).toBe(0);
  });
});

describe('the skyline with the scene\'s own camera', () => {
  const profile = shippedTerrain()('im2-athena');
  if (!profile) throw new Error('IM-2 ships its horizon profile');
  const look = startLook(YAW);

  /** Where three's camera, posed as the scene poses it, puts a direction on a `w` x `h` view. */
  function threeAt(w: number, h: number, fov: number, az: number, el: number): [number, number] {
    const cam = new PerspectiveCamera(fov, w / h, 0.2, 1_200_000);
    const pose = cameraPose(look, 0);
    cam.position.set(...pose.position);
    cam.lookAt(new Vector3(...pose.target));
    cam.updateMatrixWorld();
    const [a, e] = [(az * Math.PI) / 180, (el * Math.PI) / 180];
    const far = new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).multiplyScalar(500_000).add(cam.position);
    const q = far.project(cam);
    return [((q.x + 1) / 2) * w, ((1 - q.y) / 2) * h];
  }

  for (const [name, w, h, fov] of [['phone', 390, 616, 62], ['desktop', 1056, 427.5, 50]] as const) {
    it(`lands where three draws it on the ${name}`, () => {
      const cam = loaderCamera({ w, h }, fov, look);
      const directions: readonly (readonly [number, number])[] = [[YAW, 0], [YAW - 12, horizonAt(profile, YAW - 12)], [YAW + 15, 4], [SKY.sunAz, SKY.sunEl]];
      for (const [az, el] of directions) {
        const got = project(cam, az, el);
        const want = threeAt(w, h, fov, az, el);
        expect(got?.[0]).toBeCloseTo(want[0], 1);
        expect(got?.[1]).toBeCloseTo(want[1], 1);
      }
    });
  }

  it('draws the profile across the whole width and a little past it, every half degree', () => {
    const cam = loaderCamera({ w: 390, h: 616 }, 62, look);
    const pts = skylinePoints(cam, (az) => horizonAt(profile, az));
    expect(pts[0]?.[0]).toBeLessThan(0);
    expect(pts.at(-1)?.[0]).toBeGreaterThan(390);
    const mid = pts[Math.floor(pts.length / 2)] ?? [0, 0];
    expect(mid[0]).toBeCloseTo(195, 0);
    const [, levelY] = project(cam, YAW, 0) ?? [0, 0];
    expect(mid[1]).toBeCloseTo(levelY - (Math.tan((horizonAt(profile, YAW) * Math.PI) / 180) * cam.f), 0);
  });

  it('pins the Earth inside the phone\'s left edge, where the scene cannot show it, and shows it on the desktop', () => {
    const phone = bodyPlace(loaderCamera({ w: 390, h: 616 }, 62, look), SKY.earthAz, SKY.earthEl);
    expect(phone.pinned).toBe(-1);
    expect(phone.x).toBe(22);
    const desk = bodyPlace(loaderCamera({ w: 1056, h: 427.5 }, 50, look), SKY.earthAz, SKY.earthEl);
    expect(desk.pinned).toBe(0);
    expect(desk.x).toBeLessThan(528);
    const sun = bodyPlace(loaderCamera({ w: 390, h: 616 }, 62, look), SKY.sunAz, SKY.sunEl);
    expect(sun).toEqual({ x: expect.closeTo(195, 1), y: expect.any(Number), pinned: 0 });
  });

  it('seeds faint stars over the skyline only, the same every time', () => {
    const stars = seededStars(7, { w: 390, h: 616 }, 280);
    expect(stars).toHaveLength(Math.round((390 * 616) / 2600));
    expect(stars).toEqual(seededStars(7, { w: 390, h: 616 }, 280));
    for (const s of stars) {
      expect(s.y).toBeLessThan(250);
      expect(s.opacity).toBeGreaterThan(0.17);
      expect(s.opacity).toBeLessThan(0.64);
    }
  });
});

describe('the loader\'s picture', () => {
  it('is the tiles, then the skyline, on every tier today', () => {
    for (const tier of ['low', 'medium', 'high'] as const) expect(loaderPicture(tier)).toBe('tilesThenSkyline');
  });
});
