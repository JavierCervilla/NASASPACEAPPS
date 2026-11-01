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
 * The site the views show for a selected id: a listed one, the custom
 * point (whose id carries its point), or, for an id the build-time list
 * lacks, a neutral site with that id. Pure.
 */
import type { I18n } from '../i18n/translate';
import type { PhoneSite } from '../phone/phone-site';
import { unlistedSite } from '../phone/unlisted-site';
import { customPointOf } from './custom-point';
import { customSite } from './custom-site';

export function selectedSite<T extends PhoneSite>(
  sites: readonly T[],
  id: string,
  i18n: I18n,
): T | PhoneSite {
  const listed = sites.find((site) => site.id === id);
  if (listed) return listed;
  const point = customPointOf(id);
  return point ? customSite(point, sites, i18n) : unlistedSite(id);
}
