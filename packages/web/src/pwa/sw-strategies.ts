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
 * cannot be kept (a full quota) is skipped, never the answer. The answer
 * goes to the page at once and its copy is kept in the background
 * (VENT-90): waiting for the store held the page's first byte until the
 * whole file was down and written. The cache storage, `fetch` and the
 * `defer` that keeps the worker alive come in, so they run in tests
 * without a worker.
 */

export interface SwNet {
  readonly caches: CacheStorage;
  readonly fetch: (request: Request) => Promise<Response>;
  /** The clock, Unix ms. */
  readonly now: () => number;
  /** Keeps the worker alive until `work` settles (`waitUntil`). */
  readonly defer: (work: Promise<unknown>) => void;
}

export interface Keep {
  readonly cache: string;
  /** Pages: kept and matched without their query string (`?site=`). */
  readonly ignoreSearch?: boolean;
}

/** Turns the copy of `request`'s answer into what is kept (stamped). */
export type Stamp = (
  response: Response,
  request: Request,
) => Promise<Response>;

/** How a copy is kept: where, and stamped how. */
type KeepHow = Keep & { readonly stamp?: Stamp | undefined };

/**
 * `response` (a copy) as one that never says it was redirected: a
 * browser refuses a redirected answer to a navigation.
 */
async function unredirected(response: Response): Promise<Response> {
  if (!response.redirected) return response;
  const { status, statusText, headers } = response;
  return new Response(await response.blob(), { status, statusText, headers });
}

/** Keeps `response` for `request`, a page's under its query-free URL. */
async function keepCopy(
  cache: Cache,
  request: Request,
  response: Response,
  how: KeepHow,
): Promise<void> {
  const url = new URL(request.url);
  url.search = '';
  // The request's headers go along, for a Vary header to match.
  const key = how.ignoreSearch
    ? new Request(url.href, { headers: request.headers })
    : request;
  const copy = await unredirected(response);
  await cache.put(key, how.stamp ? await how.stamp(copy, request) : copy);
}

/** Keeps a copy of a good `response` in the background, never failing. */
function keepLater(
  net: SwNet,
  cache: Cache,
  request: Request,
  how: KeepHow & { readonly response: Response },
): void {
  if (!how.response.ok) return;
  // Cloned now, before the page starts reading the answer.
  const copy = how.response.clone();
  net.defer(keepCopy(cache, request, copy, how).catch(() => undefined));
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
  keepLater(net, cache, request, { ...keep, response, stamp });
  return response;
}

/** The kept copy, or the network's answer, kept when good. */
export async function cacheFirst(
  net: SwNet,
  request: Request,
  cacheName: string,
  stamp?: Stamp,
): Promise<Response> {
  const cache = await net.caches.open(cacheName);
  const kept = await cache.match(request);
  if (kept) return kept;
  const response = await net.fetch(request);
  keepLater(net, cache, request, { cache: cacheName, response, stamp });
  return response;
}
