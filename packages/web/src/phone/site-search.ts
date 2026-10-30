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
 * The site picker's search and region filter: a query searches every
 * region; with no query the region control filters. Pure, so it is tested
 * without a page.
 */
import type { SiteGroup } from '@ventana/sim';
import type { PhoneSite } from './phone-site';

/** The regions, in the order and with the names the picker shows. */
export const REGIONS: readonly (readonly [SiteGroup, string])[] = [
  ['south_pole', 'South pole'],
  ['apollo', 'Apollo'],
  ['other', 'Other'],
];

/** The region's name: «South pole», «Apollo» or «Other». */
export function regionName(group: SiteGroup): string {
  return REGIONS.find(([g]) => g === group)?.[1] ?? group;
}

export interface SiteFilter {
  /** Free text, matched against the site name and the mission. */
  readonly query: string;
  readonly group: SiteGroup;
}

/** Lower case without accents, so «karman» finds «Kármán». */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Whether the site's name or mission contains the query. */
export function matchesQuery(site: PhoneSite, query: string): boolean {
  const wanted = foldText(query);
  if (wanted === '') return true;
  return [site.name, site.mission].some((text) =>
    foldText(text).includes(wanted),
  );
}

/**
 * The sites that match the filter's query in any region, in order; with
 * an empty query, the sites of the filter's region.
 */
export function filterSites(
  sites: readonly PhoneSite[],
  filter: SiteFilter,
): PhoneSite[] {
  if (foldText(filter.query) !== '') {
    return sites.filter((site) => matchesQuery(site, filter.query));
  }
  return sites.filter((site) => site.group === filter.group);
}
