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
 * The globe's side of the shared site selection: a site picked in the list
 * selects its marker and turns the Moon to it, framed clear of the docked
 * card (site-framer.ts); a marker tapped on the globe only selects (the
 * globe does not move under the finger). A saved site picked in the list
 * is a custom point (VENT-37), turned to the same way.
 */
import { wrapDeg } from '@ventana/sim';
import { customPointOf } from '../pin/custom-point';
import type { SiteStore } from '../phone/site-store';
import type { MarkerLayer } from './marker-layer';
import type { GlobeSite } from './markers';
import { moveOrbit, type Orbit } from './orbit';
import type { SiteFramer } from './site-framer';
import { loadSites, type SitesSource } from './sites-client';

export interface SelectionParts {
  readonly store: SiteStore;
  readonly markers: MarkerLayer;
  readonly framer: Pick<SiteFramer, 'fly' | 'hold'>;
  /** A marker's accessible name, in the visitor's language. */
  readonly nameOf: (site: GlobeSite) => string;
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

/** Frames the selected site among `sites`, once they have loaded. */
function holdSelected(
  parts: SelectionParts,
  sites: readonly GlobeSite[],
): void {
  const { id } = parts.store.get();
  parts.framer.hold(sites.find((site) => site.id === id) ?? null);
}

/** Follows the store; `sites` gives the sites loaded so far. */
export function bindSelection(
  parts: SelectionParts,
  sites: () => readonly GlobeSite[],
): () => void {
  const { store, markers, framer } = parts;
  return store.subscribe(() => {
    const { id, origin } = store.get();
    markers.select(id);
    const point = customPointOf(id);
    const custom = point && { id, name: '', ...point, approximate: false };
    const site = sites().find((s) => s.id === id) ?? custom;
    if (origin === 'list' && site) framer.fly(site);
    else framer.hold(null);
  });
}

/**
 * Loads the sites into the markers, frames the selected one once they
 * are in, and follows the store; returns how to stop following it.
 */
export function loadSelection(
  parts: SelectionParts,
  source: SitesSource,
): () => void {
  let sites: readonly GlobeSite[] = [];
  void loadSites(source).then((loaded) => {
    sites = loaded;
    parts.markers.setSites(loaded, parts.nameOf);
    holdSelected(parts, loaded);
  });
  return bindSelection(parts, () => sites);
}
