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
 * The pseudo-locale (en-XA): English with every letter accented and every
 * word about 40 % longer, placeholders untouched. Built from the English
 * catalogue for the e2e overflow checks, so a layout that only fits
 * English shows up before a real translation does. Never offered to a
 * visitor.
 */
import type { Catalogue, PluralForms } from './catalogue';

const PLAIN = 'abcdeghiklnorsuwyzABCDEGHIKLNORSUWYZ';
const ACCENTED = 'ȧƀçđéğĥïķŀñöřšüŵýžÅƁÇĐÉĞĤÏĶĿÑÖŘŠÜŴÝŽ';
/** A placeholder, or a run of letters. */
const TOKEN = /\{\w+\}|[A-Za-z]+/g;

const accent = (letter: string): string => {
  const at = PLAIN.indexOf(letter);
  return at === -1 ? letter : (ACCENTED[at] ?? letter);
};

/** One word, accented, with its first 40 % repeated at its end. */
function stretch(word: string): string {
  if (word.startsWith('{')) return word;
  const extra = word.slice(0, Math.ceil(word.length * 0.4));
  return [...word + extra].map(accent).join('');
}

/** `text` in the pseudo-locale. */
export function pseudoText(text: string): string {
  return text.replace(TOKEN, stretch);
}

/** The pseudo-locale catalogue of the English one. */
export function pseudoCatalogue(english: Catalogue): Catalogue {
  const entries = Object.entries(english).map(([key, value]) => {
    if (typeof value === 'string') return [key, pseudoText(value)];
    const forms = Object.entries(value as PluralForms).map(
      ([form, text]) => [form, pseudoText(text)],
    );
    return [key, Object.fromEntries(forms)];
  });
  return Object.fromEntries(entries) as Catalogue;
}
