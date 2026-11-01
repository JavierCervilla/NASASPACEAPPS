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
 * The Sun answer of the sites NASA's maps put in permanent shadow
 * (VENT-39), applied where the views take their hours from: both the
 * API's (Horizons) and the simulator's go through `shadowedHours` of
 * `@ventana/sim`, so the state, the widgets, the month's figures, the
 * calendar and the markers all see the Sun down there in every hour. Each
 * array of hours is shadowed once, so a view that asks again gets the same
 * array back.
 */
import {
  shadowedHours,
  type HourSample,
  type SiteShadow,
} from '@ventana/sim';
import type { HoursLoader } from '../phone/hours-cache';
import type { ComputedLoader } from './computed-hours';

/** What NASA's maps say about each site, by id; undefined: nothing. */
export type ShadowOf = (id: string) => SiteShadow | undefined;

/** The shadow of each of `sites` that has one. */
export function shadowsOf(
  sites: readonly { readonly id: string; readonly shadow?: SiteShadow }[],
): ShadowOf {
  const shadows = new Map<string, SiteShadow>();
  for (const { id, shadow } of sites) if (shadow) shadows.set(id, shadow);
  return (id) => shadows.get(id);
}

type Shade = (
  id: string,
  hours: readonly HourSample[],
) => readonly HourSample[];

type Shaded = Map<string, readonly HourSample[]>;

/** Shadows each array of hours once per site, keyed by the array itself. */
function onceEach(shadowOf: ShadowOf): Shade {
  const done = new WeakMap<readonly HourSample[], Shaded>();
  return (id, hours) => {
    const bySite: Shaded = done.get(hours) ?? new Map();
    done.set(hours, bySite);
    const kept = bySite.get(id);
    if (kept) return kept;
    const shaded = shadowedHours(hours, shadowOf(id));
    bySite.set(id, shaded);
    return shaded;
  };
}

/** The simulator's hours of `load`, with each site's shadow applied. */
export function shadowedComputed(
  load: ComputedLoader,
  shadowOf: ShadowOf,
): ComputedLoader {
  const shade = onceEach(shadowOf);
  return (id, range) => {
    const hours = load(id, range);
    return hours ? shade(id, hours) : null;
  };
}

/** The API's hours of `load`, with each site's shadow applied. */
export function shadowedLoader(
  load: HoursLoader,
  shadowOf: ShadowOf,
): HoursLoader {
  const shade = onceEach(shadowOf);
  return async (id, range) => [...shade(id, await load(id, range))];
}
