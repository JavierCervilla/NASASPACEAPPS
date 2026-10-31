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
 * Site and mission names in the visitor's language. The data names a site
 * in English, a proper name with descriptive words around it («Malapert A
 * region», «north of Boguslawsky», «Shackleton crater area»). Each English
 * message of the catalogue (`siteName.*`) is a pattern: its placeholders
 * match the proper names, which stay as they are, and the words around
 * them are the visitor's. A name in parts («Place (Detail)») is matched
 * part by part; several sites on one marker («A; B») name by name.
 */
import type { TextKey } from './catalogue';
import en from './messages/en.json';
import type { I18n } from './translate';

interface NamePattern {
  readonly key: TextKey;
  readonly match: RegExp;
  readonly slots: readonly string[];
}

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The English message `text` as a pattern: each placeholder a name. */
function patternOf(key: TextKey, text: string): NamePattern {
  const slots = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '');
  const source = text.split(/\{\w+\}/).map(escape).join('(.+?)');
  return { key, match: new RegExp(`^${source}$`), slots };
}

/** In the catalogue's order: a longer pattern before one it contains. */
const PATTERNS: readonly NamePattern[] = Object.entries(en)
  .filter(([key]) => key.startsWith('siteName.'))
  .map(([key, text]) => patternOf(key as TextKey, text as string));

/** One part of a name: the first pattern that matches, else as written. */
function localPart(i18n: I18n, text: string): string {
  for (const { key, match, slots } of PATTERNS) {
    const found = match.exec(text);
    if (!found) continue;
    const parts = slots.map((slot, i) => [slot, localPart(i18n, found[i + 1] ?? '')]);
    return i18n.t(key, Object.fromEntries(parts));
  }
  return text;
}

/** A trailing «(detail)», split off so each part is matched alone. */
const TRAILING = /^(.*\S)\s*\(([^()]+)\)$/;

/**
 * A site's or a mission's name in the language of `i18n`. Each name's
 * trailing «(detail)» groups are peeled off in a loop, not by recursion,
 * so even an absurdly long name cannot overflow the stack.
 */
export function localName(i18n: I18n, name: string): string {
  return name
    .split('; ')
    .map((one) => {
      const details: string[] = [];
      let head = one;
      for (let at = TRAILING.exec(head); at; at = TRAILING.exec(head)) {
        head = at[1] ?? '';
        details.unshift(` (${localPart(i18n, at[2] ?? '')})`);
      }
      return `${localPart(i18n, head)}${details.join('')}`;
    })
    .join('; ');
}

/** `site` with its name and mission in the language of `i18n`. */
export function localSite<T extends { name: string; mission: string }>(
  i18n: I18n,
  site: T,
): T {
  const mission = localPart(i18n, site.mission);
  return { ...site, name: localName(i18n, site.name), mission };
}
