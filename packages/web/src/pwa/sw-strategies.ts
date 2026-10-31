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
 * The service worker's three ways to answer (sw-routes.ts says which):
 * network first with the cache as fallback, cache first, and the API's
 * network first, which stamps each answer it keeps with when it came, so
 * the page can say «data from <date>» offline. The cache storage and
 * `fetch` come in, so the strategies run in tests without a worker.
 */
import { FETCHED_AT_HEADER } from './sw-routes';

export interface SwNet {
  readonly caches: CacheStorage;
  readonly fetch: (request: Request) => Promise<Response>;
  /** The clock, Unix ms. */
  readonly now: () => number;
}

export interface Keep {
  readonly cache: string;
  /** A query string the cached copy ignores (a page's `?site=`). */
  readonly ignoreSearch?: boolean;
}

/** The network's answer, kept when good; the kept one when it fails. */
export async function networkFirst(
  net: SwNet,
  request: Request,
  keep: Keep,
  stamp?: (response: Response) => Promise<Response>,
): Promise<Response> {
  const cache = await net.caches.open(keep.cache);
  try {
    const response = await net.fetch(request);
    if (response.ok) {
      const copy = response.clone();
      await cache.put(request, stamp ? await stamp(copy) : copy);
    }
    return response;
  } catch (error) {
    const options = { ignoreSearch: keep.ignoreSearch ?? false };
    const kept = await cache.match(request, options);
    if (kept) return kept;
    throw error;
  }
}

/** The kept copy, or the network's answer, kept when good. */
export async function cacheFirst(
  net: SwNet,
  request: Request,
  cacheName: string,
): Promise<Response> {
  const cache = await net.caches.open(cacheName);
  const kept = await cache.match(request);
  if (kept) return kept;
  const response = await net.fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/** `response` with the instant it was fetched in FETCHED_AT_HEADER. */
export async function stamped(
  response: Response,
  atMs: number,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set(FETCHED_AT_HEADER, String(atMs));
  const body = await response.blob();
  const { status, statusText } = response;
  return new Response(body, { status, statusText, headers });
}

/**
 * The API's answer, network first; each kept answer is stamped, and the
 * sync entry (`syncUrl`) records the latest.
 */
export function apiFirst(
  net: SwNet,
  request: Request,
  keep: Keep & { readonly syncUrl: string },
): Promise<Response> {
  return networkFirst(net, request, keep, async (copy) => {
    const atMs = net.now();
    const cache = await net.caches.open(keep.cache);
    await cache.put(keep.syncUrl, new Response(String(atMs)));
    return stamped(copy, atMs);
  });
}
