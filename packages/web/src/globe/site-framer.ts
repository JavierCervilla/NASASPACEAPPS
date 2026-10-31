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
 * Keeps a framed site clear of the docked card (QA F1, VENT-32). The globe
 * frames a site at load and when one is picked in the list; from then on,
 * whenever the card or the frame moves (the card measured, the sheet
 * between detents, a resize), the camera turns just enough to keep the
 * site's marker in the free band (site-aim.ts), on the orbit's springs, so
 * it lands at once under reduced motion. Once the user turns or zooms the
 * globe, the view is theirs: the framer stops until the next pick.
 */
import type { PerspectiveCamera } from 'three';
import type { GlobeSite } from './markers';
import { moveOrbit, type Orbit } from './orbit';
import { flyTo } from './selection';
import { aimLatitude, type AimView } from './site-aim';
import type { SiteCallout } from './site-callout';

/** A site to frame: where it is on the Moon. */
export type FramedSite = Pick<GlobeSite, 'lat' | 'lonEast'>;

export interface SiteFramerParts {
  readonly orbit: Orbit;
  /** Its view offset is the Moon's frame (stage.ts, frameCamera). */
  readonly camera: Pick<PerspectiveCamera, 'view'>;
  /** Gives the free band and says when it may have moved. */
  readonly callout: Pick<SiteCallout, 'band' | 'watch'>;
  readonly invalidate: () => void;
  readonly reducedMotion: () => boolean;
}

export interface SiteFramer {
  /** Turns the globe to `site` (picked in the list) and frames it. */
  fly(site: FramedSite): void;
  /**
   * Frames `site` from where the orbit aims, unless the user has moved
   * the globe since the last framing; null: frame nothing.
   */
  hold(site: FramedSite | null): void;
  /** Stops following the callout. */
  dispose(): void;
}

/** What the framer framed last, and the orbit's targets it left. */
interface Framing {
  site: FramedSite | null;
  aimed: string;
}

/** The view the nudge is worked out in; null before the frame is set. */
function aimViewOf(parts: SiteFramerParts): AimView | null {
  const { view } = parts.camera;
  if (!view?.enabled) return null;
  return {
    frameTop: -view.offsetY,
    frameHeight: view.fullHeight,
    distance: parts.orbit.distance.target,
    band: parts.callout.band(),
  };
}

/** The orbit's targets, to tell the framer's moves from the user's. */
function targetsOf(orbit: Orbit): string {
  return [orbit.lat, orbit.lon, orbit.distance].map((a) => a.target).join();
}

/** Turns the camera to keep the framed site in the band, if it is still. */
function refit(parts: SiteFramerParts, framing: Framing): void {
  const { orbit } = parts;
  const view = aimViewOf(parts);
  const { site } = framing;
  if (!site || !view || targetsOf(orbit) !== framing.aimed) return;
  const latDeg = aimLatitude(site.lat, orbit.lat.target, view) -
    orbit.lat.target;
  if (latDeg === 0) return;
  moveOrbit(orbit, { latDeg, lonEastDeg: 0, distance: 0 },
    parts.reducedMotion());
  framing.aimed = targetsOf(orbit);
  parts.invalidate();
}

/** A framer over `parts`; the orbit's aim at creation counts as framed. */
export function createSiteFramer(parts: SiteFramerParts): SiteFramer {
  const { orbit } = parts;
  const framing: Framing = { site: null, aimed: targetsOf(orbit) };
  const hold = (site: FramedSite | null): void => {
    framing.site = site;
    refit(parts, framing);
  };
  const fly = (site: FramedSite): void => {
    flyTo(orbit, site, parts.reducedMotion());
    framing.aimed = targetsOf(orbit);
    parts.invalidate();
    hold(site);
  };
  const dispose = parts.callout.watch(() => refit(parts, framing));
  return { fly, hold, dispose };
}
