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
 * (the hash: `#globe`, `#polar-map`).
 */
import { saveChoice, type ChoiceStorage } from './choice';
import type { Locale } from './locales';
import { localePath } from './routes';

/** `locale`'s page under `base`, on the view of `hash`. */
export function localeHref(base: string, locale: Locale, hash: string) {
  return `${localePath(base, locale)}${hash}`;
}

/** What switching needs from the browser. */
export interface SwitchDeps {
  readonly storage: ChoiceStorage | null;
  readonly location: Pick<Location, 'hash' | 'assign'>;
}

/** Keeps `locale` as the choice and opens its page, on the same view. */
export function switchLocale(base: string, locale: Locale, deps: SwitchDeps) {
  saveChoice(deps.storage, locale);
  deps.location.assign(localeHref(base, locale, deps.location.hash));
}
