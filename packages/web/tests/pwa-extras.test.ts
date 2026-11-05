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
 * VENT-95: the install set is what every device uses; the maps only the desktop layout uses (the 2K start maps and the
 * polar map) are kept after the page has started, by the worker, when the page asks for the desktop's set. A phone never
 * asks. The worker keeps a copy only when its body hashes to the build's hash, as the install does (VENT-90).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { keepDeviceExtras, type ExtrasHost } from '../src/pwa/keep-extras';
import { extrasAsked, keepExtras, KEEP_EXTRAS } from '../src/pwa/sw-extras';

const SCOPE = new URL('https://ventana.test/');
const at = (path: string) => new URL(path, SCOPE).href;
const h = (body: string) => createHash('sha256').update(body).digest('hex').slice(0, 16);
const digest = (data: ArrayBuffer) => crypto.subtle.digest('SHA-256', data);
const DESKTOP = ['textures/moon-lroc-2k.jpg', 'textures/moon-lola-normal-2k.jpg', 'textures/moon-south-polar-2k.jpg'];
const BODIES: Record<string, string> = {
  'textures/moon-lroc-2k.jpg': 'lroc 2k',
  'textures/moon-lola-normal-2k.jpg': 'lola 2k',
  'textures/moon-south-polar-2k.jpg': 'polar',
};
const HASHES = Object.fromEntries(Object.entries(BODIES).map(([p, b]) => [p, h(b)]));
const CACHE = 'ventana-static-bbbbbbbbbbbb';

/** In-memory cache storage. */
function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (req: RequestInfo | URL) => new URL(typeof req === 'string' || req instanceof URL ? req : req.url).href;
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      put: async (req: RequestInfo | URL, res: Response) => {
        store.set(keyOf(req), new Response(await res.blob(), res));
      },
      match: async (req: RequestInfo | URL) => store.get(keyOf(req))?.clone(),
    };
  };
  return { caches: { open } as unknown as CacheStorage, stores };
}

/** A network serving `bodies` by path; `stale` answers a path from the HTTP cache with other bytes. */
function fakeServer(bodies: Record<string, string>, stale: Record<string, string> = {}) {
  const asked: { path: string; cache: RequestCache }[] = [];
  const fetch = async (request: Request) => {
    const path = new URL(request.url).pathname.slice(1);
    asked.push({ path, cache: request.cache });
    if (request.cache !== 'reload' && path in stale) return new Response(stale[path]);
    if (!(path in bodies)) throw new TypeError('offline');
    return new Response(bodies[path]);
  };
  return { fetch, asked };
}

function setup(bodies = BODIES, stale: Record<string, string> = {}) {
  const { caches, stores } = fakeCaches();
  const server = fakeServer(bodies, stale);
  const store = { caches, fetch: server.fetch, digest };
  const build = { cache: CACHE, hashes: HASHES, scope: SCOPE };
  const kept = async () => [...(stores.get(CACHE)?.keys() ?? [])].map((u) => new URL(u).pathname.slice(1)).sort();
  return { store, build, stores, server, kept };
}

describe('the worker keeps the extras it is asked for (VENT-95)', () => {
  it('keeps every map of the set, each checked against the build’s hash', async () => {
    const { store, build, stores, kept } = setup();
    await keepExtras(store, build, DESKTOP);
    expect(await kept()).toEqual([...DESKTOP].sort());
    expect(await stores.get(CACHE)!.get(at('textures/moon-south-polar-2k.jpg'))!.text()).toBe('polar');
  });

  it('asks nothing for a map it already keeps', async () => {
    const { store, build, server } = setup();
    await keepExtras(store, build, DESKTOP);
    server.asked.length = 0;
    await keepExtras(store, build, DESKTOP);
    expect(server.asked).toEqual([]);
  });

  it('takes the HTTP cache’s copy when it hashes right, and asks the server past it when it does not', async () => {
    const { store, build, server, stores } = setup(BODIES, { 'textures/moon-lroc-2k.jpg': 'an older build’s 2k' });
    await keepExtras(store, build, DESKTOP);
    const lroc = server.asked.filter((a) => a.path === 'textures/moon-lroc-2k.jpg').map((a) => a.cache);
    expect(lroc).toEqual(['default', 'reload']);
    expect(await stores.get(CACHE)!.get(at('textures/moon-lroc-2k.jpg'))!.text()).toBe('lroc 2k');
    expect(server.asked.filter((a) => a.path === 'textures/moon-lola-normal-2k.jpg').map((a) => a.cache)).toEqual([
      'default',
    ]);
  });

  it('never keeps bytes of another build, and a failed map leaves the others kept', async () => {
    const other = { ...BODIES, 'textures/moon-lroc-2k.jpg': 'a newer build’s 2k' };
    delete (other as Record<string, string>)['textures/moon-lola-normal-2k.jpg'];
    const { store, build, kept } = setup(other);
    await expect(keepExtras(store, build, DESKTOP)).resolves.toBeUndefined();
    expect(await kept()).toEqual(['textures/moon-south-polar-2k.jpg']);
  });

  it('keeps nothing the build does not hash', async () => {
    const { store, build, kept, server } = setup({ ...BODIES, 'secret.txt': 'x' });
    await keepExtras(store, build, ['secret.txt']);
    expect(await kept()).toEqual([]);
    expect(server.asked).toEqual([]);
  });

  it('reads a set by name from the message, and nothing from any other message', () => {
    const sets = { desktop: DESKTOP };
    expect(extrasAsked({ type: KEEP_EXTRAS, set: 'desktop' }, sets)).toEqual(DESKTOP);
    for (const data of [null, 'desktop', { type: 'other', set: 'desktop' }, { type: KEEP_EXTRAS, set: 'phone' },
      { type: KEEP_EXTRAS, set: '__proto__' }, { type: KEEP_EXTRAS, set: 'toString' }, { type: KEEP_EXTRAS }]) {
      expect(extrasAsked(data, sets)).toEqual([]);
    }
  });
});

/** A page whose layout and start are driven by the test. */
function page(phone: boolean) {
  const state = { phone, started: undefined as (() => void) | undefined, change: new Set<() => void>() };
  const postMessage = vi.fn();
  const host: ExtrasHost = {
    phone: () => state.phone,
    onLayoutChange: (run) => {
      state.change.add(run);
      return () => state.change.delete(run);
    },
    worker: async () => ({ postMessage }),
    afterStart: (run) => {
      state.started = run;
    },
  };
  const start = async () => {
    state.started?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  const turn = async (toPhone: boolean) => {
    state.phone = toPhone;
    for (const run of [...state.change]) run();
    await Promise.resolve();
    await Promise.resolve();
  };
  return { host, postMessage, start, turn, state };
}

describe('the page asks for the desktop extras (VENT-95)', () => {
  it('a desktop asks for its set once the page has started, not before', async () => {
    const p = page(false);
    keepDeviceExtras(p.host);
    expect(p.postMessage).not.toHaveBeenCalled();
    await p.start();
    expect(p.postMessage).toHaveBeenCalledExactlyOnceWith({ type: KEEP_EXTRAS, set: 'desktop' });
  });

  it('a phone never asks them', async () => {
    const p = page(true);
    keepDeviceExtras(p.host);
    await p.start();
    await p.turn(true);
    expect(p.postMessage).not.toHaveBeenCalled();
  });

  it('a phone-sized page that turns into the desktop layout (a tablet turned) asks once, then stops listening', async () => {
    const p = page(true);
    keepDeviceExtras(p.host);
    await p.start();
    await p.turn(false);
    await p.turn(true);
    await p.turn(false);
    expect(p.postMessage).toHaveBeenCalledExactlyOnceWith({ type: KEEP_EXTRAS, set: 'desktop' });
    expect(p.state.change.size).toBe(0);
  });

  it('asks nothing when no worker is active', async () => {
    const p = page(false);
    const host = { ...p.host, worker: async () => null };
    keepDeviceExtras(host);
    await p.start();
    expect(p.postMessage).not.toHaveBeenCalled();
  });
});
