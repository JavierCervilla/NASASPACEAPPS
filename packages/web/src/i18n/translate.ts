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
 * The translator of one locale: messages with their `{placeholders}`
 * filled, plurals picked by Intl.PluralRules, and numbers written by
 * Intl.NumberFormat («84,79» in Spanish). Pure: the catalogue comes in.
 */
import type {
  Catalogue,
  Params,
  PluralForms,
  PluralKey,
  TextKey,
} from './catalogue';
import { FORMAT_TAGS, type UiLocale } from './locales';

export interface I18n {
  readonly locale: UiLocale;
  /** The tag Intl formats with («en-GB» for English). */
  readonly tag: string;
  readonly t: (key: TextKey, params?: Params) => string;
  /** The message for `count`, which fills its `{n}`. */
  readonly plural: (key: PluralKey, count: number, params?: Params) => string;
  /** `value` with exactly `digits` decimals (none by default). */
  readonly number: (value: number, digits?: number) => string;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** `text` with each `{name}` of `params` filled; unknown ones kept. */
export function fill(text: string, params: Params = {}): string {
  return text.replace(PLACEHOLDER, (whole, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : whole,
  );
}

/** A number formatter of `tag`, one per decimal count, made on demand. */
function numberWriter(tag: string): (value: number, digits?: number) => string {
  const made = new Map<number, Intl.NumberFormat>();
  return (value, digits = 0) => {
    let format = made.get(digits);
    if (!format) {
      const options = { minimumFractionDigits: digits };
      format = new Intl.NumberFormat(tag, {
        ...options,
        maximumFractionDigits: digits,
      });
      made.set(digits, format);
    }
    return format.format(value);
  };
}

/** The translator of `locale`, over its `catalogue`. */
export function createI18n(locale: UiLocale, catalogue: Catalogue): I18n {
  const tag = FORMAT_TAGS[locale];
  const rules = new Intl.PluralRules(tag);
  const number = numberWriter(tag);
  const plural = (key: PluralKey, count: number, params: Params = {}) => {
    const forms: PluralForms = catalogue[key];
    const text = forms[rules.select(count)] ?? forms.other;
    return fill(text, { ...params, n: number(count) });
  };
  const t = (key: TextKey, params?: Params) => fill(catalogue[key], params);
  return { locale, tag, t, plural, number };
}
