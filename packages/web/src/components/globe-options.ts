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
 * What the page hands the globe when it mounts it (components/Globe.tsx):
 * the shared stores, the page's own measurements and the words in the
 * visitor's language, with what the mounted globe says back (its first map,
 * its view, its compass).
 */
import { pageAnchors } from '../globe/band-watch';
import type { GlobeOptions } from '../globe/globe';
import { graticuleText } from '../globe/graticule/text';
import { markerLabel, type GlobeSite } from '../globe/markers';
import { localName } from '../i18n/site-names';
import type { I18n } from '../i18n/translate';
import { prefersSaveData } from '../lib/viewport';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** The stores the page shares with the globe. */
export type SharedStores = Pick<
  GlobeOptions,
  'time' | 'base' | 'sitesUrl' | 'store' | 'sheetEdge' | 'state' | 'layers'
>;

/** What the mounted globe tells the page. */
export type GlobeSignals = Pick<
  GlobeOptions,
  'onTextured' | 'onView' | 'onCompass'
>;

const reducedMotion = (): boolean => matchMedia(REDUCED_MOTION).matches;

/** The options for a globe mounted in `host`, in `i18n`'s language. */
export function globeOptions(
  host: HTMLElement,
  stores: SharedStores,
  i18n: I18n,
  signals: GlobeSignals,
): GlobeOptions {
  // The globe's sites come from the API, named in English.
  const markerName = (site: GlobeSite): string =>
    markerLabel(i18n, { ...site, name: localName(i18n, site.name) });
  return {
    ...stores,
    saveData: prefersSaveData(),
    reducedMotion,
    warn: (message) => console.warn(message),
    anchors: () => pageAnchors(host),
    markerName,
    graticuleText: graticuleText(i18n),
    ...signals,
  };
}
