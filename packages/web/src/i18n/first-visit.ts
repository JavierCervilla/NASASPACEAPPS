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
 * The redirect of the English page at `/`, inlined in its head so it runs
 * before anything paints: a kept choice opens its locale; with none, the
 * first visit opens the best of the browser's languages, once. An
 * explicit locale URL (`/fr/`) never runs it. Without storage it stays
 * on English: it could not remember that it already chose.
 */
import { CHOICE_KEY } from './choice';
import { LOCALES } from './locales';

/** What the script reads, fixed at build time. */
export interface FirstVisitConfig {
  /** The site's base path, ending in `/`. */
  readonly base: string;
  /** The offered locales, the default first. */
  readonly locales: readonly string[];
  readonly choiceKey: string;
  /** Set once the browser's languages have been looked at. */
  readonly seenKey: string;
}

/** The part of `window` the script uses. */
export interface FirstVisitWindow {
  readonly localStorage: Pick<Storage, 'getItem' | 'setItem'>;
  readonly navigator: { readonly languages?: readonly string[] };
  readonly location: Pick<Location, 'search' | 'hash' | 'replace'>;
}

/**
 * Runs in the page as written (it is serialised), so it uses nothing
 * outside its own body.
 */
export function firstVisit(win: FirstVisitWindow, config: FirstVisitConfig) {
  try {
    const store = win.localStorage;
    const offered = config.locales;
    const saved = store.getItem(config.choiceKey);
    const seen = store.getItem(config.seenKey) !== null;
    store.setItem(config.seenKey, '1');
    const primary = (tag: string) => String(tag).toLowerCase().split('-')[0];
    const wanted = seen ? [] : (win.navigator.languages ?? []).map(primary);
    const found = wanted.find((tag) => offered.includes(tag ?? ''));
    const target = saved && offered.includes(saved) ? saved : found;
    if (!target || target === offered[0]) return;
    const { search, hash } = win.location;
    win.location.replace(`${config.base}${target}/${search}${hash}`);
  } catch {
    // No storage: stay on English.
  }
}

/** The inline script for the page at `base`. */
export function firstVisitScript(base: string): string {
  const config: FirstVisitConfig = {
    base: base.replace(/\/?$/, '/'),
    locales: LOCALES,
    choiceKey: CHOICE_KEY,
    seenKey: `${CHOICE_KEY}.seen`,
  };
  return `(${firstVisit.toString()})(window, ${JSON.stringify(config)});`;
}
