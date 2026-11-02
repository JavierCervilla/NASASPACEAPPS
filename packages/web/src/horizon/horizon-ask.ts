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
 * How the page asks the API for a point's terrain horizon (VENT-40,
 * VENT-44): one entry per point on the server's grid, whatever form its
 * longitude came in, so 190° E and -170° E share one request; and a queue
 * that asks for the points in the background one at a time (the saved
 * sites), since the server keeps only two rays at work and refuses a
 * burst, and that waits while the browser is offline. A failure that may
 * pass is tried again a few times (VENT-45); once those run out the point
 * is «lapsed», and asked again on {@link HorizonRequests.retryFailed}.
 */
import { customId, customPointOf, snapPoint } from '../pin/custom-point';
import type { LatLon } from '../lib/polar-projection';
import type { HorizonCache } from './horizon-cache';
import { askWithRetry, type Waits } from './horizon-retry';
import type { HorizonFetch } from './point-horizon';

/** What the page learnt of each point, by its grid id. */
export type Fetched = HorizonCache;

/** The key of `point`: its id on the grid; null when not a point. */
export function pointKey(point: LatLon): string | null {
  return snapPoint(point) ? customId(point) : null;
}

/**
 * Asks for a point's horizon unless it is on its way or known; with
 * `again`, also when the last answer was a failure. Never rejects.
 */
export type Ask = (point: LatLon, again: boolean) => Promise<void>;

/** What an {@link Ask} works with. */
interface AskParts extends Waits {
  readonly fetchHorizon: HorizonFetch;
  readonly fetched: Fetched;
  /** Called on every change of what `fetched` says. */
  readonly changed: () => void;
}

/**
 * An {@link Ask} that keeps each answer in `fetched`, then `changed`; the
 * points whose tries ran out go in `lapsed`, by key.
 */
export function createAsk(
  parts: AskParts,
  lapsed: Map<string, LatLon>,
): Ask {
  const { fetchHorizon, fetched, changed } = parts;
  return async (point, again) => {
    const key = pointKey(point);
    const kind = key === null ? 'unavailable' : fetched.get(key)?.kind;
    const busy = kind === 'loading' || kind === 'terrain';
    if (key === null || busy || (kind !== undefined && !again)) return;
    fetched.keep(key, { kind: 'loading' });
    lapsed.delete(key);
    // A failure shown before: the strip goes back to «loading».
    if (kind !== undefined) changed();
    const asked = await askWithRetry(() => fetchHorizon(point), parts);
    if (asked.lapsed) lapsed.set(key, point);
    fetched.keep(key, asked.horizon);
    changed();
  };
}

/** Points asked one at a time, in the order they were added. */
export interface SerialQueue {
  /** Adds a point, unless it is already waiting. */
  readonly add: (point: LatLon) => void;
  /** Starts the waiting points again, if the queue had paused. */
  readonly resume: () => void;
}

/**
 * Runs `run` for one point at a time, in the order they were added; a
 * point already waiting is not added twice. While `canRun` says no, the
 * next point waits until {@link SerialQueue.resume}.
 */
export function createSerialQueue(
  run: (point: LatLon) => Promise<void>,
  canRun: () => boolean = () => true,
): SerialQueue {
  const waiting: LatLon[] = [];
  let busy = false;
  const next = (): void => {
    const point = canRun() ? waiting.shift() : undefined;
    busy = point !== undefined;
    if (point) void run(point).then(next, next);
  };
  const resume = (): void => {
    if (!busy) next();
  };
  const add = (point: LatLon): void => {
    const key = pointKey(point);
    if (waiting.some((p) => pointKey(p) === key)) return;
    waiting.push(point);
    resume();
  };
  return { add, resume };
}

/** The ways the page asks for horizons. */
export interface HorizonRequests {
  /** The selected site's: held for the session, asked again on failure. */
  readonly request: (id: string) => void;
  /** A saved site's, in the background, one at a time. */
  readonly prefetch: (point: LatLon) => void;
  /**
   * Asks again for every point whose tries ran out: the selected one at
   * once, every other (selected before, or saved) through the background
   * queue, so a burst of lapsed points never reaches the server at once.
   */
  readonly retryFailed: () => void;
}

/** What the requests work with. */
export interface RequestParts extends AskParts {
  /** Whether the browser is online: the background queue waits if not. */
  readonly isOnline: () => boolean;
}

/** The requests over `parts`. */
export function createRequests(parts: RequestParts): HorizonRequests {
  const lapsed = new Map<string, LatLon>();
  let current: string | null = null;
  const ask = createAsk(parts, lapsed);
  const request = (id: string): void => {
    const point = customPointOf(id);
    current = point ? pointKey(point) : null;
    if (!point || current === null) return;
    parts.fetched.hold(current);
    void ask(point, true);
  };
  const queue = createSerialQueue(
    (point) => ask(point, lapsed.has(pointKey(point) ?? '')),
    parts.isOnline,
  );
  const retryFailed = (): void => {
    for (const [key, point] of [...lapsed]) {
      if (key === current) void ask(point, true);
      else queue.add(point);
    }
    queue.resume();
  };
  return { request, prefetch: queue.add, retryFailed };
}
