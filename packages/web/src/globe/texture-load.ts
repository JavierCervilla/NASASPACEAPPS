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
 * One Moon map load for the swapper (texture-fetch.ts), bounded and told
 * (VENT-99). A load that neither lands nor fails within MAP_TIMEOUT_MS
 * fails like any other, so a hung request never keeps the swapper busy;
 * the browser's request cannot be aborted through three's loader, so it is
 * ignored instead, and a texture it brings late is freed, never handed on.
 * Each outcome is an event for the `?debug` breadcrumbs (map-trace.ts).
 */
import { failureOf, MapTimeout } from './map-failure';
import type { MapAsk, MapTrace } from './map-trace';

/**
 * Generous: the 4K pair (1.4 MB colour, 2.4 MB relief, fetched side by
 * side) still lands at 0.5 Mbit/s and the 8K colour (5.3 MB) at 0.7, decode
 * included; a phone network slower than that retries the level later.
 */
export const MAP_TIMEOUT_MS = 60_000;

/** Times the loads and bounds them; tests pass a fake one. */
export interface LoadClock {
  readonly now: () => number;
  /** Calls `fn` after `ms`; returns what cancels it. */
  readonly after: (ms: number, fn: () => void) => () => void;
}

export const PAGE_CLOCK: LoadClock = {
  now: () => performance.now(),
  after: (ms, fn) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
};

/** What a load needs from the swapper's dependencies. */
export interface MapLoadDeps<T> {
  readonly load: (url: string, kind: 'colour' | 'normal') => Promise<T>;
  readonly dispose: (texture: T) => void;
  readonly trace?: MapTrace<T> | undefined;
  readonly clock?: LoadClock | undefined;
}

/** `load`, rejected with MapTimeout past the bound; frees a late texture. */
function bounded<T>(
  load: Promise<T>,
  clock: LoadClock,
  dispose: (texture: T) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let late = false;
    const cancel = clock.after(MAP_TIMEOUT_MS, () => {
      late = true;
      reject(new MapTimeout(MAP_TIMEOUT_MS / 1000));
    });
    // Settling a settled promise does nothing: only the texture needs care.
    load.then(
      (texture) => {
        cancel();
        if (late) dispose(texture);
        else resolve(texture);
      },
      (error: unknown) => {
        cancel();
        reject(error);
      },
    );
  });
}

/** Loads `ask`'s map within the bound, telling the trace how it went. */
export async function loadMap<T>(
  ask: MapAsk,
  deps: MapLoadDeps<T>,
): Promise<T> {
  const clock = deps.clock ?? PAGE_CLOCK;
  const start = clock.now();
  const kind = ask.map === 'colour' ? 'colour' : 'normal';
  const { level, map } = ask;
  const file = ask.url.split('/').pop() ?? ask.url;
  deps.trace?.mark({ kind: 'loading', level, map, file });
  try {
    const texture = await bounded(deps.load(ask.url, kind), clock,
      deps.dispose);
    const seconds = (clock.now() - start) / 1000;
    const size = deps.trace?.size(texture) ?? '';
    deps.trace?.mark({ kind: 'landed', level, map, seconds, size });
    return texture;
  } catch (error) {
    deps.trace?.mark(failureOf(ask, error));
    throw error;
  }
}
