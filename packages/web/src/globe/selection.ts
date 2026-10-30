/**
 * The globe's side of the shared site selection: a site picked in the list
 * selects its marker and turns the Moon to it; a marker tapped on the globe
 * only selects (the globe does not move under the finger).
 */
import { wrapDeg } from '@ventana/sim';
import type { SiteStore } from '../phone/site-store';
import type { MarkerLayer } from './marker-layer';
import type { GlobeSite } from './markers';
import { moveOrbit, type Orbit } from './orbit';

export interface SelectionParts {
  readonly store: SiteStore;
  readonly markers: MarkerLayer;
  readonly orbit: Orbit;
  readonly invalidate: () => void;
  readonly reducedMotion: () => boolean;
}

/**
 * Turns the orbit to look down on `site` the short way round; with
 * `follow` it lands at once (reduced motion), else the springs carry it.
 */
export function flyTo(
  orbit: Orbit,
  site: Pick<GlobeSite, 'lat' | 'lonEast'>,
  follow: boolean,
): void {
  const delta = {
    latDeg: site.lat - orbit.lat.target,
    lonEastDeg: wrapDeg(site.lonEast - orbit.lon.target),
    distance: 0,
  };
  moveOrbit(orbit, delta, follow);
}

/** Follows the store; `sites` gives the sites loaded so far. */
export function bindSelection(
  parts: SelectionParts,
  sites: () => readonly GlobeSite[],
): () => void {
  const { store, markers } = parts;
  return store.subscribe(() => {
    const { id, origin } = store.get();
    markers.select(id);
    const site = sites().find((s) => s.id === id);
    if (origin !== 'list' || !site) return;
    flyTo(parts.orbit, site, parts.reducedMotion());
    parts.invalidate();
  });
}
