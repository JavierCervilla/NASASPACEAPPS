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
 * Changing the interface's language: the choice is kept for the next visit
 * to `/`, and the browser goes to that locale's page with the same view
 * (the hash: `#globe`, `#polar-map`) and the same place: the address's own
 * parameters (`?site=`, the pin's `?lat&lon`, `?glass=`, the on-foot
 * view's diagnostic `?onfoot=`, the dev tools' `?debug`, the benchmark's
 * `?bench`) go along, any
 * other is left behind.
 */
import { saveChoice, type ChoiceStorage } from './choice';
import type { Locale } from './locales';
import { localePath } from './routes';

/** The query parameters that say what the page shows. */
const KEPT_PARAMS =
  ['site', 'lat', 'lon', 'glass', 'onfoot', 'debug', 'bench'] as const;

/** `search`'s kept parameters, as a query string; empty when none is. */
function keptQuery(search: string): string {
  const from = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const name of KEPT_PARAMS) {
    const value = from.get(name);
    if (value !== null) kept.set(name, value);
  }
  const query = kept.toString();
  return query ? `?${query}` : '';
}

/** `locale`'s page under `base`, with `search`'s place, on `hash`'s view. */
export function localeHref(
  base: string,
  locale: Locale,
  where: Pick<Location, 'search' | 'hash'>,
) {
  return `${localePath(base, locale)}${keptQuery(where.search)}${where.hash}`;
}

/** What switching needs from the browser. */
export interface SwitchDeps {
  readonly storage: ChoiceStorage | null;
  readonly location: Pick<Location, 'search' | 'hash' | 'assign'>;
  /**
   * Runs just before the page is left: the app navigates on purpose, so
   * what marks a page that died (the on-foot view's open mark) is cleared.
   */
  readonly leaving: () => void;
}

/** Keeps `locale` as the choice and opens its page, on the same view. */
export function switchLocale(base: string, locale: Locale, deps: SwitchDeps) {
  saveChoice(deps.storage, locale);
  deps.leaving();
  deps.location.assign(localeHref(base, locale, deps.location));
}
