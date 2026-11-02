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
 * What the page learnt of each point's horizon, by its grid id (VENT-44).
 * A point asked for as the selected site is held for the session, so the
 * saved list's background asks never push it out; of the rest, the
 * profiles of a whole saved list are kept, the oldest out past it. A
 * failure weighs nothing and is kept for good, so it is never asked again.
 */
import { SAVED_CAP } from '../saved/saved-schema';
import type { SiteHorizon } from './horizon-store';

export interface HorizonCache {
  readonly get: (key: string) => SiteHorizon | undefined;
  /** Keeps `value` for `key` as the newest entry. */
  readonly keep: (key: string, value: SiteHorizon) => void;
  /** Never lets `key` out of the cache. */
  readonly hold: (key: string) => void;
}

/** Drops the oldest profile not held once more than `cap` are kept. */
function evictPastCap(
  known: Map<string, SiteHorizon>,
  held: ReadonlySet<string>,
  cap: number,
): void {
  const spare = [...known].filter(
    ([key, value]) => value.kind === 'terrain' && !held.has(key),
  );
  const oldest = spare[0];
  if (spare.length > cap && oldest) known.delete(oldest[0]);
}

/** A cache with room for `cap` profiles beside the ones held. */
export function createHorizonCache(cap = SAVED_CAP): HorizonCache {
  const known = new Map<string, SiteHorizon>();
  const held = new Set<string>();
  return {
    get: (key) => known.get(key),
    keep: (key, value) => {
      known.delete(key);
      known.set(key, value);
      evictPastCap(known, held, cap);
    },
    hold: (key) => {
      held.add(key);
    },
  };
}
