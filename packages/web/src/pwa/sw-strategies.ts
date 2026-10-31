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
 * The service worker's two ways to answer (sw-routes.ts says which):
 * network first with the cache as fallback, and cache first; the API's
 * variant is in sw-api.ts. The network's answer always wins: a copy that
 * cannot be kept (a full quota) is skipped, never the answer. The cache
 * storage and `fetch` come in, so they run in tests without a worker.
 */

export interface SwNet {
  readonly caches: CacheStorage;
  readonly fetch: (request: Request) => Promise<Response>;
  /** The clock, Unix ms. */
  readonly now: () => number;
}

export interface Keep {
  readonly cache: string;
  /** Pages: kept and matched without their query string (`?site=`). */
  readonly ignoreSearch?: boolean;
}

/** Turns the copy into what is kept (the API stamps it). */
type Stamp = (response: Response) => Promise<Response>;

/**
 * A copy of `response` that never says it was redirected: a browser
 * refuses a redirected answer to a navigation.
 */
async function unredirected(response: Response): Promise<Response> {
  const copy = response.clone();
  if (!response.redirected) return copy;
  const { status, statusText, headers } = copy;
  return new Response(await copy.blob(), { status, statusText, headers });
}

/** Keeps `response` for `request`, a page's under its query-free URL. */
async function keepCopy(
  cache: Cache,
  request: Request,
  response: Response,
  how: Keep & { readonly stamp?: Stamp | undefined },
): Promise<void> {
  const url = new URL(request.url);
  url.search = '';
  // The request's headers go along, for a Vary header to match.
  const key = how.ignoreSearch
    ? new Request(url.href, { headers: request.headers })
    : request;
  const copy = await unredirected(response);
  await cache.put(key, how.stamp ? await how.stamp(copy) : copy);
}

/** The network's answer, kept when good; the kept one when it fails. */
export async function networkFirst(
  net: SwNet,
  request: Request,
  keep: Keep,
  stamp?: Stamp,
): Promise<Response> {
  const cache = await net.caches.open(keep.cache);
  const ignoreSearch = keep.ignoreSearch ?? false;
  let response: Response;
  try {
    response = await net.fetch(request);
  } catch (error) {
    const kept = await cache.match(request, { ignoreSearch });
    if (kept) return kept;
    throw error;
  }
  if (response.ok) {
    await keepCopy(cache, request, response, { ...keep, stamp }).catch(
      () => undefined,
    );
  }
  return response;
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
  if (response.ok) {
    await keepCopy(cache, request, response, {
      cache: cacheName,
    }).catch(() => undefined);
  }
  return response;
}
