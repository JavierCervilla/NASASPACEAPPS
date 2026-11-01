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
 * (VENT-39), and every site's terrain horizon where one is known
 * (VENT-40), applied where the views take their hours from: both the
 * API's (Horizons) and the simulator's go through `shadowedHours` and then
 * `terrainHours` of `@ventana/sim`, so the state, the widgets, the month's
 * figures, the calendar and the markers all see the same Sun and Earth.
 * Each array of hours is corrected once per site and profile, so a view
 * that asks again gets the same array back, and a profile that arrives
 * later (a custom point's) is applied on the next ask.
 */
import {
  shadowedHours,
  terrainHours,
  type HorizonProfile,
  type HourSample,
  type SiteShadow,
} from '@ventana/sim';
import type { HoursLoader } from '../phone/hours-cache';
import type { ComputedLoader } from './computed-hours';
import { NO_TERRAIN, type TerrainOf } from './terrain-profiles';

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

interface Corrected {
  readonly profile: HorizonProfile | undefined;
  readonly hours: readonly HourSample[];
}

type Shaded = Map<string, Corrected>;

/**
 * Corrects each array of hours once per site and profile, keyed by the
 * array itself.
 */
function onceEach(shadowOf: ShadowOf, terrainOf: TerrainOf): Shade {
  const done = new WeakMap<readonly HourSample[], Shaded>();
  return (id, hours) => {
    const bySite: Shaded = done.get(hours) ?? new Map();
    done.set(hours, bySite);
    const profile = terrainOf(id);
    const kept = bySite.get(id);
    if (kept && kept.profile === profile) return kept.hours;
    const shaded = shadowedHours(hours, shadowOf(id));
    const corrected = terrainHours(shaded, profile);
    bySite.set(id, { profile, hours: corrected });
    return corrected;
  };
}

/** The simulator's hours of `load`, each site's shadow and terrain applied. */
export function shadowedComputed(
  load: ComputedLoader,
  shadowOf: ShadowOf,
  terrainOf: TerrainOf = NO_TERRAIN,
): ComputedLoader {
  const shade = onceEach(shadowOf, terrainOf);
  return (id, range) => {
    const hours = load(id, range);
    return hours ? shade(id, hours) : null;
  };
}

/** The API's hours of `load`, each site's shadow and terrain applied. */
export function shadowedLoader(
  load: HoursLoader,
  shadowOf: ShadowOf,
  terrainOf: TerrainOf = NO_TERRAIN,
): HoursLoader {
  const shade = onceEach(shadowOf, terrainOf);
  return async (id, range) => [...shade(id, await load(id, range))];
}
