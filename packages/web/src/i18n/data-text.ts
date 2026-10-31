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
 * language. The data is English: each English message of the catalogue
 * (`siteData.*`) is a pattern, its `{date}` an ISO day and its `{month}`
 * an ISO month of the data, written back in the visitor's format. Text
 * the catalogue does not know yet shows as the data wrote it.
 */
import type { TextKey } from './catalogue';
import en from './messages/en.json';
import type { I18n } from './translate';

/** What each placeholder of a data pattern matches in the English text. */
const SLOTS: Readonly<Record<string, string>> = {
  date: '(\\d{4}-\\d{2}-\\d{2})',
  month: '(\\d{4}-\\d{2})',
};

interface DataPattern {
  readonly key: TextKey;
  readonly match: RegExp;
  readonly slots: readonly string[];
}

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The English message `text` as a pattern over the data. */
function patternOf(key: TextKey, text: string): DataPattern {
  const slots = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '');
  const source = text
    .split(/\{\w+\}/)
    .map(escape)
    .reduce((all, part, i) => `${all}${SLOTS[slots[i - 1] ?? ''] ?? ''}${part}`);
  return { key, match: new RegExp(`^${source}$`), slots };
}

const PATTERNS: readonly DataPattern[] = Object.entries(en)
  .filter(([key]) => key.startsWith('siteData.'))
  .map(([key, text]) => patternOf(key as TextKey, text as string));

/** An ISO day («2023-08-19») or month («2026-08»), in the visitor's format. */
export function dataDate(i18n: I18n, iso: string): string {
  const day = iso.length > 7;
  const options = day
    ? ({ day: 'numeric', month: 'short', year: 'numeric' } as const)
    : ({ month: 'short', year: 'numeric' } as const);
  const format = new Intl.DateTimeFormat(i18n.tag, { ...options, timeZone: 'UTC' });
  return format.format(new Date(day ? iso : `${iso}-01`));
}

/** `text`, from the site data, in the language of `i18n`. */
export function dataText(i18n: I18n, text: string): string {
  for (const { key, match, slots } of PATTERNS) {
    const found = match.exec(text);
    if (!found) continue;
    const params = Object.fromEntries(
      slots.map((slot, i) => [slot, dataDate(i18n, found[i + 1] ?? '')]),
    );
    return i18n.t(key, params);
  }
  return text;
}
