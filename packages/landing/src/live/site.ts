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

import {
  decodeProfile,
  type HorizonProfile,
  type SelenographicPoint,
} from '@ventana/sim';
import horizons from '../../../sim/data/horizons.json';
import sites from '../../../server/data/sites.json';

/** The site the landing answers for: IM-2 Athena, on Mons Mouton. */
export const SITE_ID = 'im2-athena';

interface ListedSite {
  readonly id: string;
  readonly lat?: number | null;
  readonly lonEast?: number | null;
}

/** IM-2's touchdown point, read from the curated list the API serves. */
export function sitePoint(
  list: readonly ListedSite[] = sites,
): SelenographicPoint {
  const site = list.find((s) => s.id === SITE_ID);
  if (typeof site?.lat !== 'number' || typeof site.lonEast !== 'number') {
    throw new Error(`landing: ${SITE_ID} has no coordinates in sites.json`);
  }
  return { latDeg: site.lat, lonEastDeg: site.lonEast };
}

/** IM-2's LOLA horizon, shipped with the simulator (VENT-40). */
export function siteProfile(): HorizonProfile {
  const point = horizons.points.find((p) => p.ids.includes(SITE_ID));
  if (!point) throw new Error(`landing: no shipped horizon for ${SITE_ID}`);
  return decodeProfile(point.profile);
}
