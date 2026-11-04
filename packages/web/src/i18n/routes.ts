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
 * Where each locale's page lives: English at the site's root, every other
 * locale under its own folder (`/es/`, `/fr/`…), and the links between
 * them that tell search engines they are one page in five languages.
 */
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type UiLocale,
} from './locales';

/** The path of `locale`'s page under the site's `base` path. */
export function localePath(base: string, locale: UiLocale): string {
  const root = base.replace(/\/?$/, '/');
  if (locale === DEFAULT_LOCALE) return root;
  return `${root}${locale.toLowerCase()}/`;
}

export interface Alternate {
  /** A locale, or `x-default` for the page a visitor of any language gets. */
  readonly hreflang: string;
  readonly href: string;
}

/**
 * The `<link rel="alternate">` of every offered locale and `x-default`
 * (English), absolute when the site's address (`site`) is known.
 */
export function alternates(base: string, site?: URL): Alternate[] {
  const href = (locale: Locale): string => {
    const path = localePath(base, locale);
    return site ? new URL(path, site).href : path;
  };
  const each = LOCALES.map((locale) => ({
    hreflang: locale,
    href: href(locale),
  }));
  return [...each, { hreflang: 'x-default', href: href(DEFAULT_LOCALE) }];
}

/**
 * The address search engines should index `locale`'s page under: the
 * primary domain (`site`, nasa.universelle.io in the image), so a copy
 * served from another host points back to it. None when `site` is unknown.
 */
export function canonicalHref(
  base: string,
  locale: UiLocale,
  site?: URL,
): string | null {
  return site ? new URL(localePath(base, locale), site).href : null;
}
