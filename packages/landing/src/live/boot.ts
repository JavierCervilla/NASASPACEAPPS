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

import { catalogueOf, translator } from '../i18n/catalogue';
import { DEFAULT_LOCALE, appPath, isLocale, type Locale } from '../i18n/locales';
import { liveAnswer } from './answer';
import { cardText } from './card-text';
import { monthBars } from './month';
import { monthWords } from './month-text';
import { drawCard, drawMonth } from './render';
import { appHashTarget } from './app-hash';

/** How often the card is worked out again while the page is shown. */
const REFRESH_MS = 60_000;

/**
 * The landing's only script (VENT-109): an old link to one of the app's
 * views (`/#horizon`) opens the app; otherwise the live card and the month
 * strip are worked out for the visitor's instant, and again every minute.
 */
export function boot(doc: Document = document): void {
  const locale = pageLocale(doc);
  const target = appHashTarget(location.hash, appPath(locale));
  if (target) {
    location.replace(target);
    return;
  }
  const draw = () => drawNow(doc, locale, Date.now());
  draw();
  setInterval(() => {
    if (doc.visibilityState === 'visible') draw();
  }, REFRESH_MS);
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') draw();
  });
}

function pageLocale(doc: Document): Locale {
  const lang = doc.documentElement.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

function drawNow(doc: Document, locale: Locale, atMs: number): void {
  const t = translator(catalogueOf(locale));
  const answer = liveAnswer(atMs);
  drawCard(doc, cardText(answer, t, locale), answer.window);
  const bars = monthBars(atMs);
  drawMonth(doc, bars, monthWords(bars, t, locale));
}
