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
 * Every catalogue, for the page build: the static page of each locale
 * reads its own and hands it to the island, so the browser never
 * downloads the other four.
 */
import type { Catalogue } from './catalogue';
import { PSEUDO_LOCALE, type Locale, type UiLocale } from './locales';
import de from './messages/de.json';
import en from './messages/en.json';
import es from './messages/es.json';
import fr from './messages/fr.json';
import it from './messages/it.json';
import { pseudoCatalogue } from './pseudo';

/** Typed here, so a key missing from any locale fails the type check. */
export const CATALOGUES: Readonly<Record<Locale, Catalogue>> = {
  en,
  es,
  fr,
  de,
  it,
};

/** The catalogue of `locale`; the pseudo-locale's is made from English. */
export function catalogueOf(locale: UiLocale): Catalogue {
  if (locale === PSEUDO_LOCALE) return pseudoCatalogue(CATALOGUES.en);
  return CATALOGUES[locale];
}
