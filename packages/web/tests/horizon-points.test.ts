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
 * The real terrain beyond the selected site (VENT-44): one horizon per point whatever form its longitude takes, the
 * saved sites' horizons asked one at a time and kept for good when they fail, and the carried pin's readout over a
 * profile the page already has, never fetched for a move.
 */
import { quantiseDeg, type HorizonProfile } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { createHorizonStore } from '../src/horizon/horizon-store';
import { pointHorizonUrl, type KnownHorizon } from '../src/horizon/point-horizon';
import { stateAtPoint, terrainStateAt } from '../src/pin/sky-state';

const SITES_URL = 'https://ventana.test/api/v1/sites';
/** Near Nobile Rim 1 on 22 November 2026 20:00 UTC: the Sun 5.7° up at 339°, the Earth 9.1° up at 314°. */
const POINT = { lat: -85.5, lonEast: 40 };
const CANVAS_MS = Date.parse('2026-11-22T20:00:00Z');

/** 0.5° all around and a 12° wall from 300° to 330° of azimuth, which hides that Earth (as tests/e2e/api-stub.ts). */
function wallProfile(): HorizonProfile {
  const centiDeg = new Int16Array(720);
  for (let i = 0; i < 720; i++) centiDeg[i] = quantiseDeg(i / 2 >= 300 && i / 2 <= 330 ? 12 : 0.5);
  return { centiDeg };
}

/** A store whose fetches the test settles by hand, in the order they were asked. */
function queuedStore() {
  const pending: { ok: (known: KnownHorizon) => void; fail: () => void }[] = [];
  const fetchHorizon = vi.fn(
    () => new Promise<KnownHorizon>((ok, fail) => pending.push({ ok, fail: () => fail(new Error('503')) })),
  );
  const store = createHorizonStore({ shipped: () => undefined, shippedResolutionM: 20, fetchHorizon });
  return { store, fetchHorizon, pending };
}

describe('one horizon per point, whatever its longitude says', () => {
  it('asks for 190° E and -170° E at the same address, in the API\'s accepted form', () => {
    const east = pointHorizonUrl(SITES_URL, { lat: -85.5, lonEast: 190 });
    expect(east).toBe(pointHorizonUrl(SITES_URL, { lat: -85.5, lonEast: -170 }));
    expect(east).toBe('https://ventana.test/api/v1/horizon?lat=-85.50&lon=-170.00');
  });

  it('keeps one entry for both, so the second asks nothing and reads the first\'s profile', async () => {
    const { store, fetchHorizon, pending } = queuedStore();
    store.request('@-85.50,190.00');
    store.request('@-85.50,-170.00');
    expect(fetchHorizon).toHaveBeenCalledTimes(1);
    const profile = wallProfile();
    pending[0]!.ok({ profile, resolutionM: 20 });
    await vi.waitFor(() => expect(store.of('@-85.50,-170.00').kind).toBe('terrain'));
    expect(store.of('@-85.50,190.00').kind).toBe('terrain');
    expect(store.cached({ lat: -85.5, lonEast: 190 })).toBe(profile);
  });
});

describe('the saved sites\' horizons, asked in the background', () => {
  it('asks one point at a time, the next once the last has answered', async () => {
    const { store, fetchHorizon, pending } = queuedStore();
    store.prefetch({ lat: -85.5, lonEast: 40 });
    store.prefetch({ lat: -84.2, lonEast: -40 });
    store.prefetch({ lat: -88.2, lonEast: 170 });
    expect(fetchHorizon).toHaveBeenCalledTimes(1);
    pending[0]!.ok({ profile: wallProfile(), resolutionM: 20 });
    await vi.waitFor(() => expect(fetchHorizon).toHaveBeenCalledTimes(2));
    expect(fetchHorizon).toHaveBeenLastCalledWith({ lat: -84.2, lonEast: -40 });
    pending[1]!.fail();
    await vi.waitFor(() => expect(fetchHorizon).toHaveBeenCalledTimes(3));
  });

  it('keeps the smooth sphere for good when a point has no terrain, and never asks twice', async () => {
    const { store, fetchHorizon, pending } = queuedStore();
    store.prefetch(POINT);
    store.prefetch(POINT);
    pending[0]!.fail();
    await vi.waitFor(() => expect(store.of('@-85.50,40.00')).toEqual({ kind: 'unavailable' }));
    store.prefetch(POINT);
    expect(fetchHorizon).toHaveBeenCalledTimes(1);
    expect(store.cached(POINT)).toBeUndefined();
  });

  it('hands out a new terrain when a saved point\'s profile arrives', async () => {
    const { store, pending } = queuedStore();
    const before = store.terrain.get();
    store.prefetch(POINT);
    pending[0]!.ok({ profile: wallProfile(), resolutionM: 20 });
    await vi.waitFor(() => expect(store.terrain.get()).not.toBe(before));
    expect(store.cached(POINT)).toBeDefined();
  });

  it('reads the cache without ever asking the API', () => {
    const { store, fetchHorizon } = queuedStore();
    expect(store.cached(POINT)).toBeUndefined();
    expect(fetchHorizon).not.toHaveBeenCalled();
  });
});

describe('a point\'s state over the terrain', () => {
  it('a wall that hides the Earth turns the smooth sphere\'s window into Sun only', () => {
    expect(stateAtPoint(POINT, CANVAS_MS)).toBe('window');
    expect(stateAtPoint(POINT, CANVAS_MS, wallProfile())).toBe('sun');
  });

  it('the carried pin reads only the profiles already kept, the smooth sphere elsewhere', () => {
    const profile = wallProfile();
    const cached = vi.fn((p: { lat: number }) => (p.lat === POINT.lat ? profile : undefined));
    const stateAt = terrainStateAt(cached, () => CANVAS_MS);
    expect(stateAt(POINT)).toBe('sun');
    expect(stateAt({ lat: -85.49, lonEast: 40 })).toBe('window');
    expect(cached).toHaveBeenCalledTimes(2);
  });
});
