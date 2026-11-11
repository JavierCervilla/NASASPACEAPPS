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

import type { CardText } from './card-text';
import type { MonthBars, Run } from './month';
import type { MonthWords } from './month-text';

/** Writes the live card's lines and state into the page. */
export function drawCard(doc: Document, text: CardText, window: boolean) {
  const card = doc.querySelector<HTMLElement>('[data-live-card]');
  if (!card) return;
  card.dataset['state'] = window ? 'window' : 'none';
  for (const [key, value] of Object.entries(text)) {
    const node = card.querySelector(`[data-live="${key}"]`);
    if (node && node.textContent !== value) node.textContent = value;
  }
}

/** Draws the month strip: its runs, its words and the instant's line. */
export function drawMonth(doc: Document, bars: MonthBars, words: MonthWords) {
  const strip = doc.querySelector<HTMLElement>('[data-month]');
  if (!strip) return;
  const sameMonth = strip.dataset['monthStart'] === String(bars.monthStartMs);
  if (!sameMonth) {
    strip.dataset['monthStart'] = String(bars.monthStartMs);
    drawRuns(strip, 'sun', bars.sun);
    drawRuns(strip, 'earth', bars.earth);
    drawRuns(strip, 'window', bars.window);
  }
  for (const [key, value] of Object.entries(words)) {
    const node = strip.querySelector(`[data-month-text="${key}"]`);
    if (node && node.textContent !== value) node.textContent = value;
  }
  const now = strip.querySelector<HTMLElement>('[data-month-now]');
  now?.style.setProperty('--now', String(bars.now));
}

/** Replaces a bar's runs; their place goes through the CSSOM (CSP). */
function drawRuns(strip: HTMLElement, kind: string, runs: readonly Run[]) {
  const bar = strip.querySelector(`[data-bar="${kind}"]`);
  if (!bar) return;
  const spans = runs.map((run) => {
    const span = strip.ownerDocument.createElement('span');
    span.className = 'month__run';
    span.style.setProperty('--from', String(run.from));
    span.style.setProperty('--to', String(run.to));
    return span;
  });
  bar.replaceChildren(...spans);
}
