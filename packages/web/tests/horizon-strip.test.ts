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
 * The terrain horizon in the interface (VENT-40, canvas option B): the API's answer for a point, the store that knows
 * each site's horizon, the strip's geometry, marks, words and model, the tiles' honest words where the terrain decides,
 * the DSN's reason and the card's source line.
 */
import { encodeProfile, quantiseDeg, type HorizonProfile, type HourSample } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import shipped from '../../sim/data/horizons.json';
import { sourceLine } from '../src/card/site-card';
import { dsnModel } from '../src/dsn/dsn-model';
import { dsnText } from '../src/dsn/dsn-text';
import { directionOf, horizonAlt } from '../src/horizon/horizon-alt';
import { createHorizonStore, type HorizonSources } from '../src/horizon/horizon-store';
import { hourSky } from '../src/horizon/hour-sky';
import { horizonFetch, horizonOf, pointHorizonUrl, TerrainNotInstalledError, type KnownHorizon } from '../src/horizon/point-horizon';
import { boxOf } from '../src/horizon/label-box';
import { placeLabels } from '../src/horizon/strip-labels';
import { EDGE_INSET, bodiesAt, stripMarks } from '../src/horizon/strip-marks';
import { stripModel } from '../src/horizon/strip-model';
import { stripScale, xOfAz, yOfEl } from '../src/horizon/strip-scale';
import { skyline } from '../src/horizon/strip-skyline';
import { terrainWords } from '../src/phone/terrain-words';
import { SHIPPED_RESOLUTION_M, shippedTerrain } from '../src/source/terrain-profiles';
import { dsnSpans, toMs } from '@ventana/sim';
import { EN, i18nOf } from './i18n-factories';

const SITES_URL = 'https://ventana.test/api/v1/sites';
const POINT = '@-85.50,40.00';

/** A profile at `deg` everywhere, and at `wallDeg` from `from` to `to` degrees of azimuth. */
function profileOf(deg: number, wall?: { from: number; to: number; deg: number }): HorizonProfile {
  const centiDeg = new Int16Array(720);
  for (let i = 0; i < 720; i++) {
    const az = i / 2;
    const inWall = wall !== undefined && az >= wall.from && az <= wall.to;
    centiDeg[i] = quantiseDeg(inWall ? wall.deg : deg);
  }
  return { centiDeg };
}

/** An hour with the bodies where the test puts them. */
function hour(sky: Partial<HourSample>): HourSample {
  return { t: '2026-11-22T20:00:00Z', sunEl: 1, sunAz: 0, earthEl: 5, earthAz: 90, dsn: null, ...sky };
}

describe('point-horizon', () => {
  it('asks the sites endpoint\'s sibling for a point on the 0.01° grid', () => {
    expect(pointHorizonUrl(SITES_URL, { lat: -85.5, lonEast: 40 })).toBe(
      'https://ventana.test/api/v1/horizon?lat=-85.50&lon=40.00',
    );
  });

  it('reads the profile and the finest grid\'s resolution from the answer', () => {
    const profile = profileOf(1.5);
    const tiers = [{ id: 'polar-south-20m', resolutionM: 20 }, { id: 'polar-south-80m', resolutionM: 80 }];
    const known = horizonOf({ profile: encodeProfile(profile), tiers });
    expect(known?.resolutionM).toBe(20);
    expect([...(known?.profile.centiDeg ?? [])]).toEqual([...profile.centiDeg]);
  });

  it('refuses what is not a horizon', () => {
    expect(horizonOf(null)).toBeNull();
    expect(horizonOf({ profile: 42, tiers: [{ resolutionM: 20 }] })).toBeNull();
    expect(horizonOf({ profile: 'A', tiers: [{ resolutionM: 20 }] })).toBeNull();
    expect(horizonOf({ profile: encodeProfile(profileOf(0)), tiers: [] })).toBeNull();
  });

  it('rejects an error answer, so the page keeps the smooth horizon', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 503 }));
    await expect(horizonFetch(fetcher, SITES_URL)({ lat: -85.5, lonEast: 40 })).rejects.toThrow('503');
  });

  it('tells a server without terrain installed from a busy one (VENT-43)', async () => {
    const answer = (error: string) => async () => new Response(JSON.stringify({ error }), { status: 503 });
    const point = { lat: -85.5, lonEast: 40 };
    await expect(horizonFetch(answer('terrain data is not installed'), SITES_URL)(point)).rejects.toBeInstanceOf(TerrainNotInstalledError);
    await expect(horizonFetch(answer('the service is busy; try again later'), SITES_URL)(point)).rejects.not.toBeInstanceOf(TerrainNotInstalledError);
  });
});

/** A store over a fetch the test settles by hand. */
function storeWithFetch(shippedProfile?: HorizonProfile) {
  let settle: { ok: (known: KnownHorizon) => void; fail: (error?: Error) => void } | null = null;
  const fetchHorizon = vi.fn(
    () =>
      new Promise<KnownHorizon>((ok, fail) => {
        settle = { ok, fail: (error = new Error('down')) => fail(error) };
      }),
  );
  const sources: HorizonSources = {
    shipped: (id) => (id === 'im2-athena' ? shippedProfile : undefined),
    shippedResolutionM: 20,
    fetchHorizon,
    sleep: async () => undefined,
  };
  return { store: createHorizonStore(sources), fetchHorizon, settle: () => settle! };
}

describe('horizon-store', () => {
  it('answers a curated site\'s shipped profile at once, and the smooth sphere for one without', () => {
    const profile = profileOf(1);
    const { store, fetchHorizon } = storeWithFetch(profile);
    expect(store.of('im2-athena')).toEqual({ kind: 'terrain', profile, resolutionM: 20 });
    expect(store.of('apollo11')).toEqual({ kind: 'smooth' });
    store.request('apollo11');
    expect(fetchHorizon).not.toHaveBeenCalled();
  });

  it('asks the API once for a custom point, then hands out a new terrain with its profile', async () => {
    const { store, fetchHorizon, settle } = storeWithFetch();
    const before = store.terrain.get();
    store.request(POINT);
    store.request(POINT);
    expect(fetchHorizon).toHaveBeenCalledTimes(1);
    expect(fetchHorizon).toHaveBeenCalledWith({ lat: -85.5, lonEast: 40 });
    expect(store.of(POINT)).toEqual({ kind: 'loading' });
    const profile = profileOf(2);
    settle().ok({ profile, resolutionM: 20 });
    await vi.waitFor(() => expect(store.of(POINT).kind).toBe('terrain'));
    expect(store.terrain.get()).not.toBe(before);
    expect(store.terrain.get()(POINT)).toBe(profile);
  });

  it('keeps the smooth sphere when the API has no terrain, and asks again on the next request', async () => {
    const { store, fetchHorizon, settle } = storeWithFetch();
    store.request(POINT);
    settle().fail();
    await vi.waitFor(() => expect(store.of(POINT)).toEqual({ kind: 'unavailable' }));
    expect(store.terrain.get()(POINT)).toBeUndefined();
    store.request(POINT);
    expect(fetchHorizon).toHaveBeenCalledTimes(2);
  });

  it('says when the server has no terrain installed yet, and asks again later', async () => {
    const { store, fetchHorizon, settle } = storeWithFetch();
    store.request(POINT);
    settle().fail(new TerrainNotInstalledError());
    await vi.waitFor(() => expect(store.of(POINT)).toEqual({ kind: 'notInstalled' }));
    store.request(POINT);
    expect(fetchHorizon).toHaveBeenCalledTimes(2);
  });

  it('the shipped profiles were read at the near band\'s 20 m', () => {
    expect(SHIPPED_RESOLUTION_M).toBe(20);
    expect(shippedTerrain()('im2-athena')?.centiDeg).toHaveLength(shipped.method.bins);
  });
});

describe('strip-scale', () => {
  it('puts north in the centre: S W N E S across the width', () => {
    expect([180, 270, 0, 90, 179.999].map((az) => Math.round(xOfAz(az, 360)))).toEqual([0, 90, 180, 270, 360]);
  });

  it('holds the level and the terrain, and states the stretch it draws', () => {
    const scale = stripScale(profileOf(0, { from: 10, to: 20, deg: 4 }), 360, 50);
    expect(scale.lo).toBeLessThan(0);
    expect(scale.hi).toBeGreaterThan(4);
    // 1° per px across; (hi - lo) / 50 degrees per px up.
    expect(scale.exaggeration).toBeCloseTo(50 / (scale.hi - scale.lo));
    expect(yOfEl(scale, scale.hi)).toBe(0);
    expect(yOfEl(scale, scale.lo)).toBe(50);
  });

  it('keeps the site\'s stretch at every usual strip width, a whole number from 2 up', () => {
    // QA on PR #25: ×4 then ×3 on IM-2 while scrubbing, ×7 then ×8 between phone widths.
    const im2 = shippedTerrain()('im2-athena')!;
    const sizes = [[256, 46], [290, 52], [330, 52], [370, 52], [256, 92]] as const;
    const stretches = sizes.map(([w, h]) => stripScale(im2, w, h).exaggeration);
    expect(new Set(stretches).size).toBe(1);
    expect(Number.isInteger(stretches[0])).toBe(true);
    // Every one of them still holds the whole skyline.
    for (const [w, h] of sizes) {
      const scale = stripScale(im2, w, h);
      expect(Math.max(...im2.centiDeg) / 100).toBeLessThan(scale.hi);
      expect(Math.min(...im2.centiDeg) / 100).toBeGreaterThan(scale.lo);
    }
  });

  it('lowers the stretch on a strip wider than any the page draws, so the terrain still fits', () => {
    const wall = profileOf(0, { from: 10, to: 20, deg: 4 });
    const wide = stripScale(wall, 1200, 40);
    expect(wide.exaggeration).toBeLessThan(stripScale(wall, 300, 52).exaggeration);
    expect(wide.hi).toBeGreaterThan(4);
  });
  it('draws the skyline from south through north back to south', () => {
    const scale = stripScale(profileOf(0, { from: 0, to: 0, deg: 3 }), 720, 40);
    const points = skyline(profileOf(0, { from: 0, to: 0, deg: 3 }), scale).split(' ');
    expect(points).toHaveLength(721);
    // The 3° bin at north stands in the middle, above the rest.
    const ys = points.map((p) => Number(p.split(',')[1]));
    expect(ys.indexOf(Math.min(...ys))).toBe(360);
  });
});

describe('strip-marks', () => {
  it('hides a body under the terrain, and never shows a Sun in permanent shadow', () => {
    const wall = profileOf(0.5, { from: 80, to: 100, deg: 10 });
    const [sun, earth] = bodiesAt(hour({ sunEl: 2, earthEl: 8 }), wall);
    expect([sun?.visible, earth?.visible]).toEqual([true, false]);
    expect(bodiesAt(hour({ sunEl: 2, sunHidden: true }), wall)[0]?.visible).toBe(false);
  });

  it('on the smooth sphere, a body shows above 0°', () => {
    const [sun, earth] = bodiesAt(hour({ sunEl: -0.2, earthEl: 0.3 }));
    expect([sun?.visible, earth?.visible]).toEqual([false, true]);
  });

  it('pins a body past the scale inside the edge it went past, without moving the scale', () => {
    const scale = stripScale(profileOf(0.5), 300, 52);
    const [sun, earth] = stripMarks(bodiesAt(hour({ sunEl: -40, earthEl: 60 })), scale);
    expect([sun?.offScale, sun?.y]).toEqual(['below', 52 - EDGE_INSET]);
    expect([earth?.offScale, earth?.y]).toEqual(['above', EDGE_INSET]);
    const on = stripMarks(bodiesAt(hour({ sunEl: 0.5, earthEl: 0.5 })), scale);
    expect(on.map((m) => m.offScale)).toEqual([null, null]);
  });
});

describe('strip-labels', () => {
  const frame = { width: 300, height: 52, fontPx: 10 };
  const at = (x: number, y: number, label: string) => ({ x, y, label });
  const boxes = (items: ReturnType<typeof at>[]) =>
    placeLabels(items, frame).map((place, i) => boxOf(items[i]!, place, frame));
  const overlap = ([a, b]: ReturnType<typeof boxOf>[]) =>
    a!.left < b!.right && b!.left < a!.right && a!.top < b!.bottom && b!.top < a!.bottom;

  it('puts a label right of its dot, and left of it near the right edge', () => {
    const [mid, edge] = placeLabels([at(100, 20, 'Sun'), at(290, 20, 'Earth')], frame);
    expect([mid?.anchor, mid?.labelX]).toEqual(['start', 109]);
    expect([edge?.anchor, edge?.labelX]).toEqual(['end', 281]);
  });

  it('parts two close labels to opposite sides of their dots', () => {
    // QA on PR #25: «Earth · hidden» over «Sun» at Haworth, the two dots 18 px apart.
    const items = [at(160, 26, 'Sun · hidden'), at(142, 18, 'Earth · hidden')];
    const places = placeLabels(items, frame);
    expect(places.map((p) => p.anchor)).toEqual(['start', 'end']);
    expect(overlap(boxes(items))).toBe(false);
  });

  it('stacks them inside the strip where an edge leaves no room for that', () => {
    for (const [x, y] of [[4, 2], [296, 50], [150, 26]] as const) {
      const items = [at(x, y, 'Sun · hidden'), at(x + 1, y, 'Earth · hidden')];
      const placed = boxes(items);
      expect(overlap(placed)).toBe(false);
      for (const box of placed) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(frame.width);
      }
      if (x !== 150) {
        for (const box of placed) {
          expect(box.top).toBeGreaterThanOrEqual(0);
          expect(box.bottom).toBeLessThanOrEqual(frame.height);
        }
      }
    }
  });

  it('leaves labels that do not touch where they are', () => {
    const places = placeLabels([at(50, 20, 'Sun'), at(250, 20, 'Earth')], frame);
    // The baseline centres the label's ascent and descent on the dot.
    expect(places.map((p) => [p.anchor, p.labelY])).toEqual([
      ['start', 22.75],
      ['start', 22.75],
    ]);
  });
});

describe('horizon words', () => {
  it('names eight points of the compass, in each language', () => {
    expect([0, 44, 90, 135, 180, 225, 270, 337.6].map((az) => directionOf(EN, az))).toEqual([
      'to the north',
      'to the north-east',
      'to the east',
      'to the south-east',
      'to the south',
      'to the south-west',
      'to the west',
      'to the north',
    ]);
    expect(directionOf(i18nOf('fr'), 270)).toBe('à l’ouest');
  });

  it('says which way each body is and whether the terrain hides it', () => {
    const bodies = bodiesAt(hour({ sunEl: 2, sunAz: 270, earthEl: 8, earthAz: 5 }), profileOf(0, { from: 0, to: 10, deg: 12 }));
    expect(horizonAlt(EN, bodies, true)).toBe(
      'The horizon all around the site, north in the centre. The Sun is to the west, above the terrain. ' +
        'The Earth is to the north, hidden by the terrain.',
    );
    expect(horizonAlt(i18nOf('es'), bodiesAt(hour({ sunEl: -1, sunAz: 270 })), false)).toContain(
      'El Sol está al oeste, bajo el horizonte.',
    );
  });
});

describe('stripModel', () => {
  const size = { width: 320, height: 52, fontPx: 10 };

  it('over terrain: the skyline, «Height ×N», the LOLA source at its resolution, hidden labels', () => {
    const horizon = { kind: 'terrain', profile: profileOf(0.5, { from: 80, to: 100, deg: 10 }), resolutionM: 20 } as const;
    const model = stripModel(EN, horizon, hour({ earthEl: 8, earthAz: 90 }), size);
    expect(model.skyline).not.toBeNull();
    expect(model.stretch).toMatch(/^Height ×\d+(\.\d)?$/);
    expect(model.source).toBe('LOLA terrain (NASA LRO), 20 m');
    expect(model.sourceShort).toBe('LOLA · 20 m');
    expect(model.note).toBeNull();
    expect(model.marks.map((m) => m.label)).toEqual(['Sun', 'Earth · hidden']);
  });

  it('a custom point while its terrain loads, and when it cannot', () => {
    const loading = stripModel(EN, { kind: 'loading' }, hour({}), size);
    expect([loading.skyline, loading.stretch, loading.source]).toEqual([null, null, 'Smooth horizon · real terrain loading']);
    expect(loading.sourceShort).toBe(loading.source);
    const down = stripModel(EN, { kind: 'unavailable' }, hour({}), size);
    expect([down.source, down.note]).toEqual(['Smooth horizon', 'Real terrain unavailable here']);
    const notYet = stripModel(EN, { kind: 'notInstalled' }, hour({}), size);
    expect([notYet.source, notYet.note]).toEqual(['Smooth horizon', 'Real terrain not installed on the server yet']);
  });

  it('keeps the stretch while the time is scrubbed, whatever the bodies do', () => {
    const horizon = { kind: 'terrain', profile: profileOf(0.5, { from: 80, to: 100, deg: 3 }), resolutionM: 20 } as const;
    const skies = [hour({ sunEl: -1.5, earthEl: 0.2 }), hour({ sunEl: 1.6, earthEl: 9.5 }), hour({ sunEl: 0, earthEl: -3 })];
    const stretches = skies.map((sky) => stripModel(EN, horizon, sky, size).stretch);
    expect(new Set(stretches).size).toBe(1);
  });

  it('states no stretch before the strip is measured, and draws no body before the hours come', () => {
    const horizon = { kind: 'terrain', profile: profileOf(1), resolutionM: 20 } as const;
    expect(stripModel(EN, horizon, null, { width: 0, height: 0, fontPx: 10 }).stretch).toBeNull();
    expect(stripModel(EN, horizon, null, size).marks).toEqual([]);
  });
});

describe('hourSky', () => {
  const site = { lat: -84.79, lonEast: 29.2 };
  const at = toMs('2026-11-22T20:30:00Z');

  it('takes the hour the views show', () => {
    const sample = hour({ sunEl: 3.3 });
    expect(hourSky(site, at, { kind: 'ready', hours: [sample] })).toBe(sample);
  });

  it('before the hours, the simulator\'s sky at the instant, the Sun hidden in permanent shadow', () => {
    const sky = hourSky({ ...site, shadow: { kind: 'psr', avgSun: 0, source: { label: 'test', url: 'https://example.test' } } }, at, { kind: 'loading' });
    expect(sky?.sunHidden).toBe(true);
    expect(sky?.sunEl).toBeGreaterThan(0);
    expect(hourSky({ lat: Number.NaN, lonEast: 0 }, at, { kind: 'loading' })).toBeNull();
    expect(hourSky(site, null, { kind: 'loading' })).toBeNull();
  });
});

describe('the tiles where the terrain decides', () => {
  it('a Sun under the level but over the ridge', () => {
    const words = terrainWords('sun', hour({ sunEl: -0.05, sunAboveTerrain: true }), EN);
    expect(words).toEqual({ detail: 'Sun 0.1° below level', terrain: 'Over the ridge' });
  });

  it('a body up but behind the terrain', () => {
    expect(terrainWords('earth', hour({ earthEl: 8.48, earthAboveTerrain: false }), EN)).toEqual({
      detail: 'Earth 8.5° up',
      terrain: 'Behind the terrain',
    });
    expect(terrainWords('sun', hour({ sunEl: 2.1, sunAboveTerrain: false }), EN).terrain).toBe('Behind the terrain');
  });

  it('says nothing more where the elevation alone is right, or without terrain', () => {
    expect(terrainWords('sun', hour({ sunEl: 3, sunAboveTerrain: true }), EN)).toEqual({ detail: 'Sun 3.0° up', terrain: undefined });
    expect(terrainWords('earth', hour({ earthEl: -1 }), EN)).toEqual({ detail: 'Earth 1.0° below', terrain: undefined });
    // An Earth under the level stays unlinked whatever the terrain: no «ridge» for it.
    expect(terrainWords('earth', hour({ earthEl: -0.4, earthAboveTerrain: true }), EN).terrain).toBeUndefined();
  });

  it('the DSN block says the terrain is why there is no link', () => {
    const at = toMs('2026-11-22T20:00:00Z');
    const spans = dsnSpans(toMs('2026-11-22T00:00:00Z'), toMs('2026-11-24T00:00:00Z'));
    expect(dsnText(dsnModel(spans, at, 8.5, false), EN).reason).toBe('Behind the terrain');
    expect(dsnText(dsnModel(spans, at, -2, false), EN).reason).toBe('Earth below the horizon');
    expect(dsnText(dsnModel(spans, at, 2, true), EN).reason).toBe('Earth too low here (needs 3°)');
  });

  it('the card\'s rule says «over the terrain» where the hours were read against it', () => {
    const at = toMs('2026-11-22T20:00:00Z');
    expect(sourceLine(EN, at, false, true)).toBe(
      'November 2026 · JPL Horizons, 1 h step · Sun and Earth over the terrain, Earth 3° up',
    );
    expect(sourceLine(EN, at, true)).toBe('November 2026 · computed here, 1 h step · Sun above 0°, Earth above 3°');
  });
});
