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
import {
  mergeColocated,
  type GlobeSite,
  type MarkerSite,
} from '../globe/markers';
import type { I18n } from '../i18n/translate';
import {
  onPolarMap,
  toPolarMap,
  type MapPoint,
} from '../lib/polar-projection';
import {
  shortName,
  splitName,
  type PhoneSite,
} from '../phone/phone-site';

export interface PolarMarker {
  /** The marker's id: its first site's. */
  readonly id: string;
  readonly site: MarkerSite;
  /** Whether it is drawn as an approximate zone. */
  readonly zone: boolean;
  /** Where its dot is, on the map's unit disk. */
  readonly at: MapPoint;
  /**
   * «IM-2», «Haworth», «Nobile · 3 sites»: the dashed ring and the
   * button's name (every site's, in full) say when it is approximate.
   */
  readonly label: string;
}

/**
 * The leading words the places of `members` share: «Nobile» for «Nobile
 * region near Mons Mouton» and «Nobile Rim 1»; the first place if none.
 */
function sharedPlace(members: readonly GlobeSite[]): string {
  const places = members.map(({ name }) => splitName(name).title.split(' '));
  const [first = []] = places;
  const differs = first.findIndex((word, i) =>
    places.some((words) => words[i] !== word),
  );
  const shared = differs === -1 ? first : first.slice(0, differs);
  return (shared.length > 0 ? shared : first).join(' ');
}

/**
 * The short label of a marker: its site's short name, or for several
 * sites on one point the place they share and how many: «Nobile · 3
 * sites». Naming one of them with a count read as that one being near.
 */
function markerText(
  first: PhoneSite,
  site: MarkerSite,
  i18n: I18n,
): string {
  const count = site.members.length;
  if (count < 2) return shortName(first);
  const place = sharedPlace(site.members);
  return i18n.plural('polar.sharedPlace', count, { place });
}

/** The markers of the sites of `sites` that lie on the map. */
export function polarMarkers(
  sites: readonly PhoneSite[],
  i18n: I18n,
): PolarMarker[] {
  const byId = new Map(sites.map((site) => [site.id, site]));
  const onMap = sites.filter((site) => onPolarMap(site.lat));
  return mergeColocated(onMap).flatMap((site) => {
    const first = byId.get(site.id);
    if (!first) return [];
    const label = markerText(first, site, i18n);
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
