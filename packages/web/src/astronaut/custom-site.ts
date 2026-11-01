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
 * The custom point as a site the views show (VENT-10): «Custom point»,
 * near the listed site closest to it, «Near Nobile Rim 1 · 26 km», with
 * its point; without any listed site to be near, no subtitle. Pure.
 */
import type { I18n } from '../i18n/translate';
import type { LatLon } from '../lib/polar-projection';
import {
  splitName,
  type CustomFacts,
  type PhoneSite,
} from '../phone/phone-site';
import { customId } from './custom-point';
import { nearestSite } from './nearest-site';

/** Below this many km the distance keeps one decimal. */
const FINE_KM = 10;

/** «26 km», «3.4 km», in the visitor's language. */
export function formatKm(i18n: I18n, km: number): string {
  const digits = km < FINE_KM ? 1 : 0;
  return i18n.t('custom.km', { n: i18n.number(km, digits) });
}

/**
 * «Near Nobile Rim 1» and «26 km» for `nearest`; both empty without one,
 * so no «Near …» shows at all.
 */
function nearFacts(
  i18n: I18n,
  nearest: ReturnType<typeof nearestSite<PhoneSite>>,
): CustomFacts {
  if (!nearest) return { near: '', distance: '' };
  const place = splitName(nearest.site.name).title;
  return {
    near: i18n.t('custom.near', { name: place }),
    distance: formatKm(i18n, nearest.km),
  };
}

/**
 * The site of the custom point at `point` (already on the grid), named by
 * the nearest of `sites`; its group is that site's, so the site picker
 * opens on the region around it.
 */
export function customSite(
  point: LatLon,
  sites: readonly PhoneSite[],
  i18n: I18n,
): PhoneSite {
  const nearest = nearestSite(point, sites);
  const name = i18n.t('custom.title');
  const custom = nearFacts(i18n, nearest);
  return {
    id: customId(point),
    name,
    mission: name,
    group: nearest?.site.group ?? 'other',
    lat: point.lat,
    lonEast: point.lonEast,
    approximate: false,
    custom,
  };
}
