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
 * How the sheet's position reaches the page, and how it is named to
 * assistive technology. Pure apart from writing the sheet's style.
 */
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import type { DetentName, Detents } from './sheet-physics';
import { writeChanged, writeReveal } from './sheet-reveal';

/**
 * The order the grabber button cycles through. Closed is not in it: a
 * closed sheet hides its grabber, and the Globe tab closes it instead.
 */
const NEXT: Readonly<Record<DetentName, Exclude<DetentName, 'closed'>>> = {
  closed: 'half',
  peek: 'half',
  half: 'full',
  full: 'peek',
};

/** Where the sheet is, and what pressing the grabber does. */
const AT: Readonly<Record<DetentName, TextKey>> = {
  closed: 'sheet.at.closed',
  peek: 'sheet.at.peek',
  half: 'sheet.at.half',
  full: 'sheet.at.full',
};
const TO: Readonly<Record<Exclude<DetentName, 'closed'>, TextKey>> = {
  peek: 'sheet.to.peek',
  half: 'sheet.to.half',
  full: 'sheet.to.full',
};

/** The detent the grabber moves to from `detent`. */
export function nextDetent(
  detent: DetentName,
): Exclude<DetentName, 'closed'> {
  return NEXT[detent];
}

/** The grabber's accessible name: where the sheet is and what it does. */
export function grabberLabel(i18n: I18n, detent: DetentName): string {
  const at = i18n.t(AT[detent]);
  const to = i18n.t(TO[nextDetent(detent)]);
  return i18n.t('sheet.grabber', { at, to });
}

/**
 * How far the sheet is open past half, 0 to 1: the scrim over the globe
 * darkens with it as the picker rises. When the half detent has risen to
 * full (200 % text), it is measured from peek instead, so the scrim
 * clears as the sheet drops (VENT-51).
 */
export function openness(detents: Detents, y: number): number {
  const lifted = detents.half <= detents.full;
  const from = lifted ? detents.peek : detents.half;
  const span = from - detents.full;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (from - y) / span));
}

/**
 * How much of the content below the summary's head shows, 0 to 1: none
 * at peek or lower, where only the head clears the tab bar, all of it from
 * half up, and a fade in between that follows the finger.
 */
export function reveal(detents: Detents, y: number): number {
  const span = detents.peek - detents.half;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (detents.peek - y) / span));
}

/**
 * Puts the sheet's top edge `y` px below the top of the viewport, and
 * tells its summary how much to reveal (`--sheet-reveal`, sheet-reveal.ts)
 * and its CSS where its top edge sits at full (`--sheet-full-top`, for
 * its height), each only when it changes.
 */
export function placeSheet(el: HTMLElement, y: number, detents: Detents) {
  el.style.transform = `translate3d(0, ${y}px, 0)`;
  writeReveal(el, reveal(detents, y));
  writeChanged(el, '--sheet-full-top', `${detents.full}px`);
}
