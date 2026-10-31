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
 * The interface's languages: English (the default, and the fallback),
 * Spanish, French, German and Italian, each on its own static route; and
 * a pseudo-locale for the overflow tests, never offered to a visitor.
 */

export const LOCALES = ['en', 'es', 'fr', 'de', 'it'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Accented English about 40 % longer: the e2e overflow checks' locale. */
export const PSEUDO_LOCALE = 'en-XA';

/** A locale the page can be built in. */
export type UiLocale = Locale | typeof PSEUDO_LOCALE;

/** Each language's name in itself: the selector's main line. */
export const AUTONYMS: Readonly<Record<Locale, string>> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

/**
 * The tag Intl formats each locale with. British English keeps the day
 * before the month («Mon 23 Nov»), as the interface always wrote it.
 */
export const FORMAT_TAGS: Readonly<Record<UiLocale, string>> = {
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  'en-XA': 'en-GB',
};

/** Whether `value` names one of the offered locales. */
export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
