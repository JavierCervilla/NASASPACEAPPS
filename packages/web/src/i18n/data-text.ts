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
 * The free text of the site data the card shows (a mission's status and
 * the date it gives when that is not a plain day), in the visitor's
 * language. The data is English, so its own words are the lookup; text
 * the catalogue does not know yet shows as the data wrote it.
 */
import type { TextKey } from './catalogue';
import en from './messages/en.json';
import type { I18n } from './translate';

/** The catalogue's keys for site data, by the English text they render. */
const DATA_KEYS: ReadonlyMap<string, TextKey> = new Map(
  Object.entries(en)
    .filter(([key]) => key.startsWith('siteData.'))
    .map(([key, text]) => [text as string, key as TextKey]),
);

/** `text`, from the site data, in the language of `i18n`. */
export function dataText(i18n: I18n, text: string): string {
  const key = DATA_KEYS.get(text);
  return key ? i18n.t(key) : text;
}
