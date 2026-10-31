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
 * Where the astronaut is (VENT-10): home in the dock, or standing on a
 * point of the Moon. Dropping it makes that point the selected site, the
 * custom point, and writes it into the address (`?lat&lon`), so it can be
 * shared and survives a reload; bringing it home selects again the listed
 * site chosen before and takes the point out of the address.
 */
import type { LatLon } from '../lib/polar-projection';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import { siteFromSearch } from '../lib/site-param';
import type { SiteStore } from '../phone/site-store';
import { customId, customPointOf } from './custom-point';
import { followListed } from './listed-site';
import { pointFromSearch, searchWithPoint } from './point-param';

export type Place =
  | { readonly kind: 'home' }
  | { readonly kind: 'moon'; readonly point: LatLon };

/** The page's address, read and rewritten in place (no history entry). */
export interface Address {
  readonly search: () => string;
  readonly replace: (search: string) => void;
}

export interface Places {
  readonly place: WatchedValue<Place>;
  /** Stands the astronaut on `point` and selects it. */
  drop(point: LatLon): void;
  /** Takes it home and selects the listed site chosen before. */
  bringHome(): void;
  /**
   * Opens what the address names, once the page runs: a point stands the
   * astronaut on it and selects it, with `?site=` (one of `ids`) as the
   * listed site to fall back to; `?site=` alone selects that site.
   */
  restore(ids: readonly string[]): void;
}

/** Opens what `search` names: `?site=` (one of `ids`), then a point. */
function restoreFrom(
  search: string,
  ids: readonly string[],
  store: SiteStore,
  stand: (point: LatLon) => void,
): void {
  const site = siteFromSearch(search, ids);
  if (site) store.select(site, 'list');
  const point = pointFromSearch(search);
  if (point) stand(point);
}

/**
 * The places, the astronaut home until {@link Places.restore} reads the
 * address. Returns them with how to stop following the store.
 */
export function createPlaces(
  store: SiteStore,
  address: Address,
): Places & { readonly stop: () => void } {
  const place = createWatchedValue<Place>({ kind: 'home' });
  const listed = followListed(store);
  // On a point it selects the point; home, the listed site chosen before.
  const stand = (point: LatLon | null): void => {
    place.set(point ? { kind: 'moon', point } : { kind: 'home' });
    if (point) store.select(customId(point), 'globe');
    else if (customPointOf(store.get().id)) store.select(listed.get(), 'list');
  };
  const write = (point: LatLon | null): void =>
    address.replace(searchWithPoint(address.search(), point));
  const move = (point: LatLon | null): void => {
    stand(point);
    write(point);
  };
  return {
    place,
    stop: listed.stop,
    drop: move,
    bringHome: () => move(null),
    restore: (ids) => restoreFrom(address.search(), ids, store, stand),
  };
}
