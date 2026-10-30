/**
 * The site picker's search and region filter. Pure, so it is tested without
 * a page.
 */
import type { SiteGroup } from '@ventana/sim';
import type { PhoneSite } from './phone-site';

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

/** The sites of the filter's region that match its query, in order. */
export function filterSites(
  sites: readonly PhoneSite[],
  filter: SiteFilter,
): PhoneSite[] {
  return sites.filter(
    (site) => site.group === filter.group && matchesQuery(site, filter.query),
  );
}
