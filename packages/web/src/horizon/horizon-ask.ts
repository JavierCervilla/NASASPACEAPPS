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
 * burst.
 */
import { customId, snapPoint } from '../pin/custom-point';
import type { LatLon } from '../lib/polar-projection';
import type { SiteHorizon } from './horizon-store';
import { TerrainNotInstalledError, type HorizonFetch } from './point-horizon';

/** As many points as the hours' cache keeps. */
const MAX_POINTS = 24;

/** What the page learnt of each point, by its grid id. */
export type Fetched = Map<string, SiteHorizon>;

/** The key of `point`: its id on the grid; null when not a point. */
export function pointKey(point: LatLon): string | null {
  return snapPoint(point) ? customId(point) : null;
}

/** Keeps `value` for `key`, the oldest out past the cap. */
function keep(fetched: Fetched, key: string, value: SiteHorizon): void {
  fetched.delete(key);
  fetched.set(key, value);
  const oldest = fetched.keys().next().value;
  if (fetched.size > MAX_POINTS && oldest !== undefined) {
    fetched.delete(oldest);
  }
}

/** What a failed request leaves: not installed yet, or unavailable. */
function failed(error: unknown): SiteHorizon {
  const notYet = error instanceof TerrainNotInstalledError;
  return { kind: notYet ? 'notInstalled' : 'unavailable' };
}

/**
 * Asks for a point's horizon unless it is on its way or known; with
 * `again`, also when the last answer was a failure. Never rejects.
 */
export type Ask = (point: LatLon, again: boolean) => Promise<void>;

/** An {@link Ask} that keeps each answer in `fetched`, then `changed`. */
export function createAsk(
  fetchHorizon: HorizonFetch,
  fetched: Fetched,
  changed: () => void,
): Ask {
  return async (point, again) => {
    const key = pointKey(point);
    const kind = key === null ? 'unavailable' : fetched.get(key)?.kind;
    const busy = kind === 'loading' || kind === 'terrain';
    if (key === null || busy || (kind !== undefined && !again)) return;
    keep(fetched, key, { kind: 'loading' });
    let answer: SiteHorizon;
    try {
      answer = { kind: 'terrain', ...(await fetchHorizon(point)) };
    } catch (error) {
      answer = failed(error);
    }
    keep(fetched, key, answer);
    changed();
  };
}

/**
 * Runs `run` for one point at a time, in the order they were added; a
 * point already waiting is not added twice.
 */
export function createSerialQueue(
  run: (point: LatLon) => Promise<void>,
): (point: LatLon) => void {
  const waiting: LatLon[] = [];
  let busy = false;
  const next = (): void => {
    const point = waiting.shift();
    busy = point !== undefined;
    if (point) void run(point).then(next, next);
  };
  return (point) => {
    const key = pointKey(point);
    if (waiting.some((p) => pointKey(p) === key)) return;
    waiting.push(point);
    if (!busy) next();
  };
}
