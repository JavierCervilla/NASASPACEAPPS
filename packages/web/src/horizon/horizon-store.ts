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
import { customPointOf } from '../pin/custom-point';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import type { TerrainOf } from '../source/terrain-profiles';
import type { HorizonFetch, KnownHorizon } from './point-horizon';

/** What the page knows of a site's horizon. */
export type SiteHorizon =
  | ({ readonly kind: 'terrain' } & KnownHorizon)
  /** A custom point's, on its way from the API. */
  | { readonly kind: 'loading' }
  /** A custom point the API has no terrain for. */
  | { readonly kind: 'unavailable' }
  /** A listed site without a shipped profile: the smooth sphere. */
  | { readonly kind: 'smooth' };

export interface HorizonStore {
  readonly of: (id: string) => SiteHorizon;
  /** Asks the API for a custom point's horizon, unless it has it. */
  readonly request: (id: string) => void;
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

/** As many points as the hours' cache keeps. */
const MAX_POINTS = 24;

type Fetched = Map<string, SiteHorizon>;

/** Keeps `value` for `id`, the oldest out past the cap. */
function keep(fetched: Fetched, id: string, value: SiteHorizon): void {
  fetched.delete(id);
  fetched.set(id, value);
  const oldest = fetched.keys().next().value;
  if (fetched.size > MAX_POINTS && oldest !== undefined) {
    fetched.delete(oldest);
  }
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
  if (!customPointOf(id)) return { kind: 'smooth' };
  return fetched.get(id) ?? { kind: 'loading' };
}

/** The store over `sources`. */
export function createHorizonStore(sources: HorizonSources): HorizonStore {
  const fetched: Fetched = new Map();
  const of = (id: string): SiteHorizon => knownOf(sources, fetched, id);
  const profileOf = (): TerrainOf => (id) => {
    const known = of(id);
    return known.kind === 'terrain' ? known.profile : undefined;
  };
  const terrain = createWatchedValue(profileOf());
  const settle = (id: string, value: SiteHorizon): void => {
    keep(fetched, id, value);
    terrain.set(profileOf());
  };
  const request = (id: string): void => {
    const point = customPointOf(id);
    const kind = fetched.get(id)?.kind;
    if (!point || kind === 'loading' || kind === 'terrain') return;
    keep(fetched, id, { kind: 'loading' });
    sources.fetchHorizon(point).then(
      (known) => settle(id, { kind: 'terrain', ...known }),
      () => settle(id, { kind: 'unavailable' }),
    );
  };
  return { of, request, terrain };
}
