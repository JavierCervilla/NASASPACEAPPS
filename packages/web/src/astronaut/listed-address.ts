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
 * Keeps the address on the listed site (VENT-10): once a listed site is
 * selected, by the list, a marker or the astronaut going home, the custom
 * point leaves the address, and a `?site=` it names moves to that site, so
 * a reload or a shared link opens what the page shows.
 */
import type { SiteStore } from '../phone/site-store';
import { customPointOf } from './custom-point';
import type { Address } from './places';
import { searchWithListed } from './point-param';

/** Follows `store`, rewriting `address`; returns how to stop. */
export function followAddress(
  store: SiteStore,
  address: Address,
): () => void {
  return store.subscribe(() => {
    const { id } = store.get();
    if (customPointOf(id)) return;
    const search = searchWithListed(address.search(), id);
    if (search !== address.search()) address.replace(search);
  });
}
