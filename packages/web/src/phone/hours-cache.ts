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
 * Keeps the hours the API answered, per site and range, for the page's
 * life: the widgets and the calendar ask for the same month, and playing
 * time or scrubbing through it must not ask again. A failed request is
 * dropped, so a retry asks anew; past `maxEntries` the oldest goes.
 */
import type { HourSample } from '@ventana/sim';
import { loadSiteHours, type HoursRange, type HoursSource } from './site-hours';

/** A site's hours for a range; rejects with the reason they could not load. */
export type HoursLoader = (
  id: string,
  range: HoursRange,
) => Promise<HourSample[]>;

/** About two years of months for one site, or a year for two. */
const MAX_ENTRIES = 24;

/** A loader that asks `source` once per site and range. */
export function cachedHours(
  source: HoursSource,
  maxEntries = MAX_ENTRIES,
): HoursLoader {
  const kept = new Map<string, Promise<HourSample[]>>();
  return (id, range) => {
    const key = `${id}|${range.from}|${range.to}`;
    const hit = kept.get(key);
    if (hit) return hit;
    const loading = loadSiteHours(source, id, range);
    loading.catch(() => {
      if (kept.get(key) === loading) kept.delete(key);
    });
    kept.set(key, loading);
    const oldest = kept.keys().next().value;
    if (kept.size > maxEntries && oldest !== undefined) kept.delete(oldest);
    return loading;
  };
}
