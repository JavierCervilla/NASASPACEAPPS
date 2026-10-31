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
 * The manifest's response for a locale's static route
 * (pages/manifest.webmanifest.ts, pages/[locale]/manifest.webmanifest.ts):
 * the curated sites named in the locale, and the right media type.
 */
import curated from '../../../server/data/sites.json';
import { catalogueOf } from '../i18n/catalogues';
import type { Locale } from '../i18n/locales';
import { localSite } from '../i18n/site-names';
import { createI18n } from '../i18n/translate';
import { webManifest } from './manifest';

/** The manifest file's name in each locale's folder. */
export const MANIFEST_FILE = 'manifest.webmanifest';

/** The manifest of `locale` for the site at `base`, as a response. */
export function manifestResponse(locale: Locale, base: string): Response {
  const i18n = createI18n(locale, catalogueOf(locale));
  const sites = curated.map((site) => localSite(i18n, site));
  const body = JSON.stringify(webManifest({ locale, base, i18n, sites }));
  const type = 'application/manifest+json';
  return new Response(body, { headers: { 'content-type': type } });
}
