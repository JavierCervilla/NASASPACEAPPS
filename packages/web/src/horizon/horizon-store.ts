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
 * The terrain horizon of each site as the page knows it (VENT-40): the
 * shipped profile of a curated site south of 80° S at once; a custom
 * point's from the API, asked once per point, the smooth sphere standing
 * in until it comes, and for good when it cannot (no terrain on the
 * server, an error, offline with nothing kept). Every change hands out
 * a new `terrain`, so the hours are read against the new profile and the
 * views draw it.
 */
import type { HorizonProfile } from '@ventana/sim';
import { customPointOf } from '../pin/custom-point';
import type { LatLon } from '../lib/polar-projection';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import type { TerrainOf } from '../source/terrain-profiles';
import {
  createAsk,
  createSerialQueue,
  pointKey,
  type Fetched,
} from './horizon-ask';
import { createHorizonCache } from './horizon-cache';
import type { HorizonFetch, KnownHorizon } from './point-horizon';

/** What the page knows of a site's horizon. */
export type SiteHorizon =
  | ({ readonly kind: 'terrain' } & KnownHorizon)
  /** A custom point's, on its way from the API. */
  | { readonly kind: 'loading' }
  /** A custom point the API has no terrain for. */
  | { readonly kind: 'unavailable' }
  /** The server has no terrain installed yet (VENT-43). */
  | { readonly kind: 'notInstalled' }
  /** A listed site without a shipped profile: the smooth sphere. */
  | { readonly kind: 'smooth' };

export interface HorizonStore {
  readonly of: (id: string) => SiteHorizon;
  /**
   * Asks the API for a custom point's horizon, unless it has it, and keeps
   * it for the session (the selected site's).
   */
  readonly request: (id: string) => void;
  /**
   * Asks for `point`'s horizon in the background, after the points asked
   * before it, one at a time; a point that failed is not asked again.
   */
  readonly prefetch: (point: LatLon) => void;
  /** The profile kept for `point`; never asks the API. */
  readonly cached: (point: LatLon) => HorizonProfile | undefined;
  /**
   * The profile the hours are read against (undefined: none), a new
   * function on every change, so a view knows to read the hours anew.
   */
  readonly terrain: WatchedValue<TerrainOf>;
}

export interface HorizonSources {
  /** The shipped profiles, by site id. */
  readonly shipped: TerrainOf;
  /** The resolution the shipped profiles were read at, metres. */
  readonly shippedResolutionM: number;
  readonly fetchHorizon: HorizonFetch;
}

/** What the page knows of site `id`'s horizon. */
function knownOf(
  sources: HorizonSources,
  fetched: Fetched,
  id: string,
): SiteHorizon {
  const profile = sources.shipped(id);
  const resolutionM = sources.shippedResolutionM;
  if (profile) return { kind: 'terrain', profile, resolutionM };
  const point = customPointOf(id);
  const key = point ? pointKey(point) : null;
  if (key === null) return { kind: 'smooth' };
  return fetched.get(key) ?? { kind: 'loading' };
}

/** The profile known for `key`, if any. */
function profileAt(fetched: Fetched, key: string | null) {
  const known = key === null ? undefined : fetched.get(key);
  return known?.kind === 'terrain' ? known.profile : undefined;
}

/** The store over `sources`. */
export function createHorizonStore(sources: HorizonSources): HorizonStore {
  const fetched: Fetched = createHorizonCache();
  const of = (id: string): SiteHorizon => knownOf(sources, fetched, id);
  const profileOf = (): TerrainOf => (id) => {
    const known = of(id);
    return known.kind === 'terrain' ? known.profile : undefined;
  };
  const terrain = createWatchedValue(profileOf());
  const changed = (): void => terrain.set(profileOf());
  const ask = createAsk(sources.fetchHorizon, fetched, changed);
  const request = (id: string): void => {
    const point = customPointOf(id);
    const key = point ? pointKey(point) : null;
    if (key !== null) fetched.hold(key);
    if (point) void ask(point, true);
  };
  const prefetch = createSerialQueue((point) => ask(point, false));
  const cached = (point: LatLon) => profileAt(fetched, pointKey(point));
  return { of, request, prefetch, cached, terrain };
}
