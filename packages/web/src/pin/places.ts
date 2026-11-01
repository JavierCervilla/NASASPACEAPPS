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
 * Where the pin is (VENT-10, VENT-37): nowhere yet, or on a point of the
 * Moon. Dropping it makes that point the selected site, the custom point,
 * and writes it into the address (`?lat&lon`), so it can be shared and
 * survives a reload. Picking a listed site (in the list or on a marker)
 * takes the pin away and the point out of the address (moving `?site=`
 * to that site when the address names one), so a reload opens what is
 * shown.
 */
import type { LatLon } from '../lib/polar-projection';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import { siteFromSearch } from '../lib/site-param';
import type { SiteStore } from '../phone/site-store';
import { customId, customPointOf } from './custom-point';
import { followAddress } from './listed-address';
import { pointFromSearch, searchWithPoint } from './point-param';

export type Place =
  | { readonly kind: 'none' }
  | { readonly kind: 'moon'; readonly point: LatLon };

/** The page's address, read and rewritten in place (no history entry). */
export interface Address {
  readonly search: () => string;
  readonly replace: (search: string) => void;
}

export interface Places {
  readonly place: WatchedValue<Place>;
  /** Stands the pin on `point` and selects it. */
  drop(point: LatLon): void;
  /**
   * Opens what the address names, once the page runs: a point stands the
   * pin on it and selects it; `?site=` (one of `ids`) alone selects that
   * site.
   */
  restore(ids: readonly string[]): void;
}

const NONE = { kind: 'none' } as const;

/** Opens what `search` names: `?site=` (one of `ids`), then a point. */
function restoreFrom(
  search: string,
  ids: readonly string[],
  store: SiteStore,
  drop: (point: LatLon) => void,
): void {
  const site = siteFromSearch(search, ids);
  if (site) store.select(site, 'list');
  const point = pointFromSearch(search);
  if (point) drop(point);
}

/** Takes the pin away once a listed site is selected; returns the stop. */
function clearOnListed(
  store: SiteStore,
  place: WatchedValue<Place>,
): () => void {
  return store.subscribe(() => {
    if (!customPointOf(store.get().id)) place.set(NONE);
  });
}

/**
 * The places, no pin until one is dropped or {@link Places.restore}
 * reads the address. Returns them with how to stop following the store.
 */
export function createPlaces(
  store: SiteStore,
  address: Address,
): Places & { readonly stop: () => void } {
  const place = createWatchedValue<Place>(NONE);
  const unfollow = followAddress(store, address);
  const unclear = clearOnListed(store, place);
  const drop = (point: LatLon): void => {
    place.set({ kind: 'moon', point });
    store.select(customId(point), 'globe');
    address.replace(searchWithPoint(address.search(), point));
  };
  return {
    place,
    stop: () => [unfollow, unclear].forEach((fn) => fn()),
    drop,
    restore: (ids) => restoreFrom(address.search(), ids, store, drop),
  };
}
