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
 * What a site marker shows. Pure, so the classification is tested without a
 * page.
 */
import type { Site } from '@ventana/sim';
import type { I18n } from '../i18n/translate';

/** The part of a site the globe draws. */
export type GlobeSite = Pick<
  Site,
  'id' | 'name' | 'lat' | 'lonEast' | 'approximate'
>;

/**
 * `exact`: a published touchdown or landing point, drawn as a solid dot.
 * `zone`: a stand-in for a region with no citable point (Artemis candidate
 * regions, targets named only by a feature), drawn as a dashed ring.
 */
export type MarkerKind = 'exact' | 'zone';

export function markerKind(site: Pick<Site, 'approximate'>): MarkerKind {
  return site.approximate ? 'zone' : 'exact';
}

/**
 * The accessible name of a marker: the site, and whether its point is exact.
 */
export function markerLabel(i18n: I18n, site: GlobeSite): string {
  const exact = markerKind(site) === 'exact';
  return i18n.t(exact ? 'marker.exact' : 'marker.zone', { name: site.name });
}

/** A marker on the globe: one site, or several that share one point. */
export interface MarkerSite extends GlobeSite {
  /** The sites this marker stands for, in list order. */
  readonly members: readonly GlobeSite[];
}

function toMarker(members: readonly [GlobeSite, ...GlobeSite[]]): MarkerSite {
  const [first] = members;
  return {
    id: first.id,
    name: members.map((site) => site.name).join('; '),
    lat: first.lat,
    lonEast: first.lonEast,
    approximate: members.every((site) => site.approximate),
    members,
  };
}

/**
 * One marker per point: sites with identical coordinates share a marker
 * whose name lists them all, so no two buttons sit on the same spot. The
 * marker is exact if any of its sites is.
 */
export function mergeColocated(sites: readonly GlobeSite[]): MarkerSite[] {
  const byPoint = new Map<string, [GlobeSite, ...GlobeSite[]]>();
  for (const site of sites) {
    const key = `${site.lat},${site.lonEast}`;
    const group = byPoint.get(key);
    if (group) group.push(site);
    else byPoint.set(key, [site]);
  }
  return [...byPoint.values()].map(toMarker);
}
