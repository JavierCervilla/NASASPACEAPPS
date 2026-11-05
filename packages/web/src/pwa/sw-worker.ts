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
 * The service worker (VENT-28), bundled into `sw.js` at the site's base
 * by scripts/service-worker.mjs after the build, which defines
 * `__SW_CONFIG__`: the build's digest, the files to cache at install and
 * the hash of each file it may keep.
 * The pages, network first, so a deploy is never hidden behind a stale
 * shell; the build's files, cache first, under a cache named after the
 * build: the offline set at install, the rest (the 4K and 8K maps) the
 * first time the page uses them; the API's GETs, network first,
 * their last answers offline. Every answer goes to the page before its
 * copy is kept, and a new build downloads only the files whose hash
 * changed (sw-reuse.ts, VENT-90).
 */
import { apiFirst } from './sw-api';
import type { Hashes } from './sw-hash';
import { activateBuild, installBuild } from './sw-reuse';
import {
  API_CACHE,
  routeOf,
  staticCacheName,
  SYNC_ENTRY,
} from './sw-routes';
import { cacheFirst, networkFirst, type SwNet } from './sw-strategies';

declare const __SW_CONFIG__: {
  readonly digest: string;
  /**
   * Paths under the scope: the offline set (pages, build files, manifests,
   * icons and phase frames, thumbnails, the 1K, 2K and polar maps). The
   * 4K and 8K maps are kept as the zoom uses them.
   */
  readonly precache: readonly string[];
  /** Every file it may keep, at install or later: path to its hash. */
  readonly hashes: Hashes;
};

interface WaitEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface SwFetchEvent extends WaitEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

interface SwScope {
  readonly registration: { readonly scope: string };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, listener: (event: never) => void): void;
}

const sw = self as unknown as SwScope;
const scope = new URL(sw.registration.scope);
// Read once: the build inlines the config at each use of the name.
const CONFIG = __SW_CONFIG__;
const STATIC = staticCacheName(CONFIG.digest);
const store = {
  caches,
  fetch: (request: Request) => fetch(request),
  digest: (data: ArrayBuffer) => crypto.subtle.digest('SHA-256', data),
};
const build = { cache: STATIC, hashes: CONFIG.hashes, scope };

async function install(): Promise<void> {
  await installBuild(store, build, CONFIG.precache);
  await sw.skipWaiting();
}

async function activate(): Promise<void> {
  await activateBuild(store, build);
  await sw.clients.claim();
}

function answer(event: SwFetchEvent): Promise<Response> | null {
  const { request } = event;
  if (request.method !== 'GET') return null;
  const net: SwNet = {
    caches: store.caches,
    fetch: store.fetch,
    now: () => Date.now(),
    defer: (work) => event.waitUntil(work),
  };
  const url = new URL(request.url);
  const route = routeOf(url, scope, request.mode === 'navigate');
  if (route === 'html') {
    return networkFirst(net, request, { cache: STATIC, ignoreSearch: true });
  }
  if (route === 'static') return cacheFirst(net, request, STATIC);
  if (route === 'api') {
    const syncUrl = new URL(SYNC_ENTRY, scope).href;
    return apiFirst(net, request, { cache: API_CACHE, syncUrl });
  }
  return null;
}

sw.addEventListener('install', (event: WaitEvent) => {
  event.waitUntil(install());
});
sw.addEventListener('activate', (event: WaitEvent) => {
  event.waitUntil(activate());
});
sw.addEventListener('fetch', (event: SwFetchEvent) => {
  const response = answer(event);
  if (response) event.respondWith(response);
});
