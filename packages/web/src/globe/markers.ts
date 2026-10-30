/**
 * What a site marker shows. Pure, so the classification is tested without a
 * page.
 */
import type { Site } from '@ventana/sim';

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
export function markerLabel(site: GlobeSite): string {
  const kind = markerKind(site) === 'exact' ? 'landing site' : 'approximate zone';
  return `${site.name}, ${kind}`;
}
