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

import de from './messages/de.json';
import en from './messages/en.json';
import es from './messages/es.json';
import fr from './messages/fr.json';
import it from './messages/it.json';
import type { Locale } from './locales';

/** Every message key, typed from the English catalogue. */
export type Messages = typeof en;
export type MessageKey = keyof Messages;

/** The values a message's `{name}` placeholders take. */
export type Vars = Readonly<Record<string, string | number>>;

/** Reads a message, its placeholders filled in. */
export type Translate = (key: MessageKey, vars?: Vars) => string;

const CATALOGUES: Readonly<Record<Locale, Messages>> = { en, es, fr, de, it };

/** The catalogue of `locale`. */
export function catalogueOf(locale: Locale): Messages {
  return CATALOGUES[locale];
}

/** The translator of `messages`: a missing placeholder stays as written. */
export function translator(messages: Messages): Translate {
  return (key, vars = {}) =>
    messages[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in vars ? String(vars[name]) : whole,
    );
}
