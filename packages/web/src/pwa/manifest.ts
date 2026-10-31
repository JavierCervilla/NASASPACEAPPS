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
 * The web app manifest of each locale (VENT-28): installed from /es/,
 * the app opens /es/ and stays in it. Its name is the proper noun, its
 * description and shortcuts in the locale's language; the shortcuts
 * open a featured site through the page's `?site=` parameter
 * (lib/site-param.ts). Pure: the page build serves it.
 */
import type { Locale } from '../i18n/locales';
import { localePath } from '../i18n/routes';
import type { I18n } from '../i18n/translate';
import { shortName } from '../phone/phone-site';
import { BACKGROUND } from './ring';

/** The sites the shortcuts open: one per kind of landing the app shows. */
export const FEATURED_SITES = [
  'im2-athena',
  'change7-target',
  'artemis-haworth',
  'apollo11',
] as const;

/** A site, already named in the locale's language. */
export interface NamedSite {
  readonly id: string;
  readonly name: string;
  readonly mission: string;
}

export interface ManifestInput {
  readonly locale: Locale;
  readonly base: string;
  readonly i18n: I18n;
  readonly sites: readonly NamedSite[];
}

interface Icon {
  readonly src: string;
  readonly sizes: string;
  readonly type: 'image/png';
  readonly purpose: 'any' | 'maskable';
}

/** The install icons (scripts/app_icons.py) under the site's root. */
export function manifestIcons(root: string): Icon[] {
  const icon = (file: string, side: number, purpose: Icon['purpose']) => ({
    src: `${root}icons/${file}`,
    sizes: `${side}x${side}`,
    type: 'image/png' as const,
    purpose,
  });
  return [
    icon('icon-192.png', 192, 'any'),
    icon('icon-512.png', 512, 'any'),
    icon('icon-maskable-512.png', 512, 'maskable'),
  ];
}

/** The shortcuts to the featured sites, in the order of FEATURED_SITES. */
function shortcuts(input: ManifestInput, home: string, icons: Icon[]) {
  const featured = FEATURED_SITES.flatMap((id) =>
    input.sites.filter((site) => site.id === id),
  );
  return featured.map((site) => ({
    name: site.name,
    short_name: shortName(site),
    url: `${home}?site=${encodeURIComponent(site.id)}`,
    icons: icons.slice(0, 1),
  }));
}

/** The manifest of `input.locale`. */
export function webManifest(input: ManifestInput) {
  const root = localePath(input.base, 'en');
  const home = localePath(input.base, input.locale);
  const icons = manifestIcons(root);
  return {
    id: home,
    name: 'Ventana Lunar',
    short_name: 'Ventana',
    description: input.i18n.t('manifest.description'),
    lang: input.locale,
    dir: 'ltr',
    start_url: home,
    scope: home,
    display: 'standalone',
    orientation: 'any',
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    categories: ['education', 'science'],
    icons,
    shortcuts: shortcuts(input, home, icons),
  };
}
