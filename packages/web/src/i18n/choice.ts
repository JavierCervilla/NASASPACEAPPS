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
 * The visitor's chosen language, kept in the browser's storage by the
 * language selector, so the next visit to `/` opens in it. Storage can
 * be missing or refuse access (private modes, blocked cookies): then
 * nothing is kept and nothing breaks.
 */
import { isLocale, type Locale } from './locales';

/** The part of `Storage` the choice uses. */
export type ChoiceStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Where the choice is kept; the first-visit script reads it too. */
export const CHOICE_KEY = 'ventana.locale';

/** The browser's persistent storage, or null when it refuses it. */
export function localStore(): ChoiceStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The kept choice; null when there is none or it cannot be read. */
export function readChoice(storage: ChoiceStorage | null): Locale | null {
  try {
    const kept = storage?.getItem(CHOICE_KEY);
    return isLocale(kept) ? kept : null;
  } catch {
    return null;
  }
}

/** Keeps `locale` as the visitor's choice, if the browser lets it. */
export function saveChoice(
  storage: ChoiceStorage | null,
  locale: Locale,
): void {
  try {
    storage?.setItem(CHOICE_KEY, locale);
  } catch {
    // Refused storage: the explicit locale URL still carries the choice.
  }
}
