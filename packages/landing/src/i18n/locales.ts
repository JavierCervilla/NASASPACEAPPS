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
 * The landing's languages (VENT-109): the app's five, each on its own route,
 * English at the root and the default.
 */
export const LOCALES = ['en', 'es', 'fr', 'de', 'it'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** The landing's route of `locale`: `/` for English, `/es/` and so on. */
export function landingPath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
}

/** The app's route of `locale`, under /app (its SITE_BASE). */
export function appPath(locale: Locale): string {
  return `/app${landingPath(locale)}`;
}

/** Whether `value` names one of the landing's languages. */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
