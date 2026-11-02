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
 * A passing failure of a point's terrain horizon is asked again (VENT-45): the network, a busy server, a rate limit
 * or any 5xx are retried with a growing wait that honours Retry-After, the point staying «loading» meanwhile; once
 * the tries run out the point shows «unavailable» but is asked again when the page comes back, the browser comes back
 * online or the visitor presses «Try again». A 404 «no terrain data covers this point» stays final.
 */
import { encodeProfile, quantiseDeg } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { HORIZON_RETRY, retryDelayMs } from '../src/horizon/horizon-retry';
import { createHorizonStore } from '../src/horizon/horizon-store';
import {
  horizonFetch,
  NoTerrainHereError,
  TerrainNotInstalledError,
  TransientHorizonError,
} from '../src/horizon/point-horizon';
import { retryOnReturn } from '../src/horizon/retry-triggers';

const SITES_URL = 'https://ventana.test/api/v1/sites';
const POINT = { lat: -85.5, lonEast: 40 };
const ID = '@-85.50,40.00';

/** The API's answer for a point: a flat profile read at 20 m. */
function profileBody(): unknown {
  const centiDeg = new Int16Array(720).fill(quantiseDeg(0.5));
  return { profile: encodeProfile({ centiDeg }), tiers: [{ id: 'polar-south-20m', resolutionM: 20 }] };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const busy = (retryAfter?: string) =>
  json(503, { error: 'the service is busy; try again later' }, retryAfter ? { 'retry-after': retryAfter } : {});
const ok = () => json(200, profileBody());
const noTerrain = () => json(404, { error: 'no terrain data covers this point' });

/** A fetch that answers each request with the next of `answers` (the last one from then on). */
function scripted(...answers: (() => Response | Promise<Response>)[]) {
  let call = 0;
  return vi.fn(async () => answers[Math.min(call++, answers.length - 1)]!());
}

const offline = () => Promise.reject(new TypeError('Failed to fetch'));

/** A random source whose jitter factor is exactly 1: the waits the policy plans. */
const NO_JITTER = () => 0.5;

/** A store over `fetcher`, whose waits resolve at once and are recorded. */
function storeOver(fetcher: ReturnType<typeof scripted>) {
  const waits: number[] = [];
  const sleep = vi.fn(async (ms: number) => void waits.push(ms));
  const store = createHorizonStore({
    shipped: () => undefined,
    shippedResolutionM: 20,
    fetchHorizon: horizonFetch(fetcher as unknown as typeof fetch, SITES_URL),
    sleep,
    random: NO_JITTER,
  });
  return { store, waits, fetcher };
}

describe('horizonFetch tells a passing failure from a final one', () => {
  const ask = (answer: () => Response | Promise<Response>) =>
    horizonFetch(scripted(answer) as unknown as typeof fetch, SITES_URL)(POINT);

  it('a 404 «no terrain data covers this point» is final', async () => {
    await expect(ask(noTerrain)).rejects.toBeInstanceOf(NoTerrainHereError);
  });

  it('a 503 «terrain data is not installed» is still told apart', async () => {
    await expect(ask(() => json(503, { error: 'terrain data is not installed' }))).rejects.toBeInstanceOf(
      TerrainNotInstalledError,
    );
  });

  it.each([
    ['a busy 503', () => busy('5'), 5000],
    ['a 429', () => json(429, { error: 'too many new points from this address; try again later' }, { 'retry-after': '12' }), 12000],
    ['a 500', () => json(500, { error: 'internal' }), null],
    ['a 502', () => new Response('<html>Bad gateway</html>', { status: 502 }), null],
    ['a 504', () => new Response('', { status: 504 }), null],
    ['the network', offline, null],
    ['a 200 that is not a profile', () => new Response('<html>portal</html>', { status: 200 }), null],
  ] as const)('%s is passing, with the Retry-After it carries', async (_, answer, retryAfterMs) => {
    const error = await ask(answer).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TransientHorizonError);
    expect((error as TransientHorizonError).retryAfterMs).toBe(retryAfterMs);
  });

  it('a 400 is final', async () => {
    const error = await ask(() => json(400, { error: 'lat must be a number' })).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(TransientHorizonError);
  });
});

describe('the wait before the next try', () => {
  it('grows 2 s, 6 s, 18 s, then gives up after four tries', () => {
    const error = new TransientHorizonError(null);
    expect([0, 1, 2, 3].map((failures) => retryDelayMs(error, failures, HORIZON_RETRY, NO_JITTER))).toEqual([
      2000, 6000, 18000, null,
    ]);
  });

  it('honours Retry-After, cut to 30 s', () => {
    expect(retryDelayMs(new TransientHorizonError(5000), 0, HORIZON_RETRY, NO_JITTER)).toBe(5000);
    expect(retryDelayMs(new TransientHorizonError(120_000), 0, HORIZON_RETRY, NO_JITTER)).toBe(30_000);
  });

  it('never waits less than the planned wait: a Retry-After of 0 does not retry at once', () => {
    expect(retryDelayMs(new TransientHorizonError(0), 0, HORIZON_RETRY, NO_JITTER)).toBe(2000);
    expect(retryDelayMs(new TransientHorizonError(1000), 1, HORIZON_RETRY, NO_JITTER)).toBe(6000);
    expect(retryDelayMs(new TransientHorizonError(0), 0, HORIZON_RETRY, () => 0)).toBe(1000);
  });

  it('spreads each planned wait by a factor from 0.5 to 1.5, from the injected random source', () => {
    const error = new TransientHorizonError(null);
    expect(retryDelayMs(error, 0, HORIZON_RETRY, () => 0)).toBe(1000);
    expect(retryDelayMs(error, 1, HORIZON_RETRY, () => 0.75)).toBe(7500);
    for (const draw of [0, 0.1, 0.5, 0.9, 0.999]) {
      HORIZON_RETRY.delaysMs.forEach((planned, failures) => {
        const wait = retryDelayMs(error, failures, HORIZON_RETRY, () => draw)!;
        expect(wait).toBeGreaterThanOrEqual(planned * 0.5);
        expect(wait).toBeLessThanOrEqual(planned * 1.5);
      });
    }
  });

  it('never waits less than a Retry-After, nor more than 30 s, whatever the jitter', () => {
    expect(retryDelayMs(new TransientHorizonError(5000), 0, HORIZON_RETRY, () => 0)).toBe(5000);
    expect(retryDelayMs(new TransientHorizonError(25_000), 2, HORIZON_RETRY, () => 0.999)).toBe(30_000);
    expect(retryDelayMs(new TransientHorizonError(120_000), 0, HORIZON_RETRY, () => 0)).toBe(30_000);
  });

  it('never retries a final failure', () => {
    expect(retryDelayMs(new NoTerrainHereError(), 0, HORIZON_RETRY, NO_JITTER)).toBeNull();
    expect(retryDelayMs(new TerrainNotInstalledError(), 0, HORIZON_RETRY, NO_JITTER)).toBeNull();
    expect(retryDelayMs(new Error('horizon 400'), 0, HORIZON_RETRY, NO_JITTER)).toBeNull();
  });
});

describe('the store retries a passing failure', () => {
  it('a busy server once, then the profile: the point ends on its terrain, loading meanwhile', async () => {
    let release = (): void => undefined;
    const fetcher = scripted(() => busy('1'), ok);
    const store = createHorizonStore({
      shipped: () => undefined,
      shippedResolutionM: 20,
      fetchHorizon: horizonFetch(fetcher as unknown as typeof fetch, SITES_URL),
      sleep: () => new Promise<void>((done) => (release = done)),
      random: NO_JITTER,
    });
    store.request(ID);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await new Promise((done) => setTimeout(done, 0));
    expect(store.of(ID)).toEqual({ kind: 'loading' });
    release();
    await vi.waitFor(() => expect(store.of(ID).kind).toBe('terrain'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('spreads the waits with the injected random source', async () => {
    const waits: number[] = [];
    const store = createHorizonStore({
      shipped: () => undefined,
      shippedResolutionM: 20,
      fetchHorizon: horizonFetch(scripted(() => json(502, {})) as unknown as typeof fetch, SITES_URL),
      sleep: async (ms) => void waits.push(ms),
      random: () => 0,
    });
    store.request(ID);
    await vi.waitFor(() => expect(store.of(ID)).toEqual({ kind: 'unavailable' }));
    expect(waits).toEqual([1000, 3000, 9000]);
  });

  it('waits as the policy says, then shows «unavailable» after four tries', async () => {
    const { store, waits, fetcher } = storeOver(scripted(() => json(502, {})));
    store.request(ID);
    await vi.waitFor(() => expect(store.of(ID)).toEqual({ kind: 'unavailable' }));
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([2000, 6000, 18000]);
  });

  it('a 404 stays final: one request, never asked again by a retry', async () => {
    const { store, fetcher } = storeOver(scripted(noTerrain));
    store.request(ID);
    await vi.waitFor(() => expect(store.of(ID)).toEqual({ kind: 'unavailable' }));
    store.retryFailed();
    await new Promise((done) => setTimeout(done, 0));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('a point whose tries ran out offline is asked again by retryFailed, and gets its terrain', async () => {
    const { store, fetcher } = storeOver(scripted(offline, offline, offline, offline, ok));
    store.request(ID);
    await vi.waitFor(() => expect(store.of(ID)).toEqual({ kind: 'unavailable' }));
    expect(fetcher).toHaveBeenCalledTimes(4);
    const before = store.terrain.get();
    store.retryFailed();
    expect(store.of(ID)).toEqual({ kind: 'loading' });
    expect(store.terrain.get()).not.toBe(before);
    await vi.waitFor(() => expect(store.of(ID).kind).toBe('terrain'));
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it('the saved rows retry one point at a time, never past the four tries', async () => {
    const { store, fetcher } = storeOver(scripted(() => busy()));
    store.prefetch(POINT);
    store.prefetch({ lat: -84.2, lonEast: -40 });
    await vi.waitFor(() => expect(store.of('@-84.20,-40.00')).toEqual({ kind: 'unavailable' }));
    const asked = fetcher.mock.calls.map((call) => String((call as unknown[])[0]));
    expect(asked).toHaveLength(8);
    expect(asked.slice(0, 4).every((url) => url.includes('lat=-85.50'))).toBe(true);
    expect(asked.slice(4).every((url) => url.includes('lat=-84.20'))).toBe(true);
  });
});

/** A store over a HorizonFetch that fails in passing until `answering` is set, then answers on the next turn, counting how many requests are in flight at once. */
function trackedStore(isOnline?: () => boolean) {
  const flight = { now: 0, most: 0, calls: 0, answering: false };
  const fetchHorizon = vi.fn(async () => {
    flight.calls++;
    if (!flight.answering) throw new TransientHorizonError(null);
    flight.most = Math.max(flight.most, ++flight.now);
    await new Promise((done) => setTimeout(done, 1));
    flight.now--;
    return { profile: { centiDeg: new Int16Array(720) }, resolutionM: 20 };
  });
  const store = createHorizonStore({
    shipped: () => undefined,
    shippedResolutionM: 20,
    fetchHorizon,
    sleep: async () => undefined,
    random: NO_JITTER,
    ...(isOnline ? { isOnline } : {}),
  });
  return { store, flight, fetchHorizon };
}

/** `count` grid ids of distinct points, and their points. */
function gridIds(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `@-88.00,${(-170 + i).toFixed(2)}`, point: { lat: -88, lonEast: -170 + i } }));
}

describe('retryFailed asks the lapsed points without a burst', () => {
  it('20 points selected before and the current one: at most two requests at once, and every one gets its terrain', async () => {
    const { store, flight } = trackedStore();
    const all = gridIds(21);
    for (const { id } of all) store.request(id);
    await vi.waitFor(() => expect(all.every(({ id }) => store.of(id).kind === 'unavailable')).toBe(true));
    flight.answering = true;
    flight.calls = 0;
    store.retryFailed();
    expect(store.of(all[20]!.id)).toEqual({ kind: 'loading' });
    await vi.waitFor(() => expect(all.every(({ id }) => store.of(id).kind === 'terrain')).toBe(true));
    expect(flight.most).toBeLessThanOrEqual(2);
    expect(flight.calls).toBe(21);
  });

  it('a saved row whose tries ran out is asked again through the background queue', async () => {
    const { store, flight } = trackedStore();
    const { id, point } = gridIds(1)[0]!;
    store.prefetch(point);
    await vi.waitFor(() => expect(store.of(id)).toEqual({ kind: 'unavailable' }));
    expect(flight.calls).toBe(4);
    flight.answering = true;
    store.retryFailed();
    await vi.waitFor(() => expect(store.of(id).kind).toBe('terrain'));
    expect(flight.calls).toBe(5);
  });
});

describe('the saved rows wait while the browser is offline', () => {
  it('asks nothing offline, then every row once back online', async () => {
    let online = false;
    const { store, flight } = trackedStore(() => online);
    flight.answering = true;
    const rows = gridIds(3);
    for (const { point } of rows) store.prefetch(point);
    await new Promise((done) => setTimeout(done, 10));
    expect(flight.calls).toBe(0);
    expect(store.of(rows[0]!.id)).toEqual({ kind: 'loading' });
    const { win, doc } = fakePage();
    retryOnReturn(store.retryFailed, { win, doc });
    online = true;
    win.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(rows.every(({ id }) => store.of(id).kind === 'terrain')).toBe(true));
    expect(flight.calls).toBe(3);
    expect(flight.most).toBe(1);
  });

  it('the selected point is still asked offline: only the background queue waits', async () => {
    const { store, flight } = trackedStore(() => false);
    flight.answering = true;
    store.request(gridIds(1)[0]!.id);
    await vi.waitFor(() => expect(store.of(gridIds(1)[0]!.id).kind).toBe('terrain'));
    expect(flight.calls).toBe(1);
  });
});

/** A fake window and document: event targets, the document with its visibility. */
function fakePage() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
  return { win, doc };
}

describe('a lapsed point is asked again when the page comes back', () => {
  it('on «online», and on becoming visible, but not on becoming hidden', () => {
    const { win, doc } = fakePage();
    const retry = vi.fn();
    const stop = retryOnReturn(retry, { win, doc });
    win.dispatchEvent(new Event('online'));
    expect(retry).toHaveBeenCalledTimes(1);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(retry).toHaveBeenCalledTimes(1);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(retry).toHaveBeenCalledTimes(2);
    stop();
    win.dispatchEvent(new Event('online'));
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(retry).toHaveBeenCalledTimes(2);
  });

  it('a point lost to the network is asked again when the browser comes back online', async () => {
    const { store, fetcher } = storeOver(scripted(offline, offline, offline, offline, ok));
    const { win, doc } = fakePage();
    retryOnReturn(store.retryFailed, { win, doc });
    store.request(ID);
    await vi.waitFor(() => expect(store.of(ID)).toEqual({ kind: 'unavailable' }));
    win.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(store.of(ID).kind).toBe('terrain'));
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});
