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
 * The landing sites the polar map draws: those from 80° S to the pole,
 * one marker per shared point (as on the globe), each with its place on
 * the map's unit disk and a short label. Sites further north (Apollo,
 * Chandrayaan-3) are left out. Pure.
 */
import { mergeColocated, type MarkerSite } from '../globe/markers';
import {
  onPolarMap,
  toPolarMap,
  type MapPoint,
} from '../lib/polar-projection';
import { shortName, type PhoneSite } from '../phone/phone-site';

export interface PolarMarker {
  /** The marker's id: its first site's. */
  readonly id: string;
  readonly site: MarkerSite;
  /** Whether it is drawn as an approximate zone. */
  readonly zone: boolean;
  /** Where its dot is, on the map's unit disk. */
  readonly at: MapPoint;
  /**
   * «IM-2», «Haworth», «Nobile region near Mons Mouton +2»: the dashed
   * ring and the button's name say when it is approximate.
   */
  readonly label: string;
}

/** The short label of a marker standing for `members`. */
function markerText(first: PhoneSite, site: MarkerSite): string {
  const more = site.members.length - 1;
  const count = more > 0 ? ` +${more}` : '';
  return `${shortName(first)}${count}`;
}

/** The markers of the sites of `sites` that lie on the map. */
export function polarMarkers(sites: readonly PhoneSite[]): PolarMarker[] {
  const byId = new Map(sites.map((site) => [site.id, site]));
  const onMap = sites.filter((site) => onPolarMap(site.lat));
  return mergeColocated(onMap).flatMap((site) => {
    const first = byId.get(site.id);
    if (!first) return [];
    const label = markerText(first, site);
    const at = toPolarMap(site);
    return [{ id: site.id, site, zone: site.approximate, at, label }];
  });
}

/** The marker standing for site `id`, if it is on the map. */
export function markerOf(
  markers: readonly PolarMarker[],
  id: string,
): PolarMarker | undefined {
  return markers.find(({ site }) =>
    site.members.some((member) => member.id === id),
  );
}
