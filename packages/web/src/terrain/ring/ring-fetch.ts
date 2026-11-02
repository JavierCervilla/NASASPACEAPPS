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
 * The ring from the API (VENT-46): a {@link RingSource} over `fetch`. The
 * ring route lists the tiles (`GET /api/v1/terrain/tiles`), then at most
 * {@link IN_FLIGHT} tile requests run at once, nearest and finest first, on
 * the immutable `?v=` URLs the route hands out. Failures are the horizon's
 * (VENT-45, horizon-errors.ts): the route's pass or are final; a tile that
 * fails for good (a 404, or the tries ran out) is a hole the parent level
 * fills, never the view's failure.
 */
import { TransientHorizonError } from '../../horizon/horizon-errors';
import { snapPoint } from '../../pin/custom-point';
import type { LatLon } from '../../lib/polar-projection';
import { getJson, inFlight, type Waits } from './ring-http';
import { parseRing, parseTile, type RingEntry } from './ring-answer';
import type { RingFeed, RingRequest, RingSource } from './ring-source';
import type { TileScheme } from '@ventana/sim';

/** The most tile requests in flight: the API's streaming guidance. */
export const IN_FLIGHT = 6;
const SITES_PATH = /\/sites$/;

/** The ring route's URL for `point`, on the server's 0.01° grid. */
export function ringUrl(sitesUrl: string, point: LatLon, levels: number) {
  const at = snapPoint(point) ?? point;
  const query = new URLSearchParams({ lat: at.lat.toFixed(2),
    lon: at.lonEast.toFixed(2), levels: String(levels) });
  return `${sitesUrl.replace(SITES_PATH, '/terrain/tiles')}?${query}`;
}

interface Deps {
  readonly fetcher: typeof fetch;
  readonly waits: Waits;
  readonly base: () => URL;
}

/** Fetches one wanted tile and feeds it; a failure is a hole, not an error. */
async function fetchTile(
  d: Deps,
  e: RingEntry,
  list: { scheme: TileScheme },
  io: { feed: RingFeed; signal: AbortSignal },
): Promise<void> {
  const url = new URL(e.url, d.base()).toString();
  const body = await getJson(d.fetcher, url, d.waits, io.signal)
    .catch((error: unknown) => {
      if (io.signal.aborted) throw error;
      return null;
    });
  const tile = body === null ? null : parseTile(body, e, list.scheme);
  if (tile && !io.signal.aborted) io.feed.tile(tile);
}

/** Feeds `request`'s ring: the route's list, then its wanted tiles. */
async function loadRing(
  d: Deps,
  sitesUrl: string,
  request: RingRequest,
  io: { feed: RingFeed; signal: AbortSignal },
): Promise<void> {
  const url = ringUrl(sitesUrl, request.point, request.levels);
  const list = parseRing(await getJson(d.fetcher, url, d.waits, io.signal));
  if (!list) throw new TransientHorizonError(null, 'ring: not a ring');
  io.feed.scheme(list.scheme);
  const wanted = request.wanted(list.scheme, list.entries);
  const left = new Map<number, number>();
  for (const e of wanted) left.set(e.level, (left.get(e.level) ?? 0) + 1);
  for (let level = 0; level < request.levels; level++) {
    if (!left.has(level)) io.feed.settled(level);
  }
  const job = (e: RingEntry) => async (): Promise<void> => {
    await fetchTile(d, e, list, io);
    const rest = (left.get(e.level) ?? 1) - 1;
    left.set(e.level, rest);
    if (rest === 0) io.feed.settled(e.level);
  };
  await inFlight(wanted.map(job), IN_FLIGHT);
}

/** A {@link RingSource} over `fetcher` against the sites endpoint. */
export function fetchRingSource(
  fetcher: typeof fetch,
  sitesUrl: string,
  waits: Waits,
): RingSource {
  const base = (): URL => new URL(sitesUrl, globalThis.location?.href);
  const deps = { fetcher, waits, base };
  return {
    load: (request, feed, signal) =>
      loadRing(deps, sitesUrl, request, { feed, signal }),
  };
}
