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
 * Where the summary's fade towards peek reads its reveal (VENT-82). It is
 * written on the summary itself, the only reader (styles/phone.css), not
 * on the sheet: a custom property on the sheet is inherited by all it
 * holds, so each frame of a drag would recalculate the whole content's
 * style. Each value is written only when it changes.
 */

/** The summary, the content the half sheet fits (sheet-lift.ts). */
const FIT = '[data-sheet-fit]';

/** Writes `value` to `el`'s custom property `name` when it differs. */
export function writeChanged(el: HTMLElement, name: string, value: string) {
  if (el.style.getPropertyValue(name) !== value) {
    el.style.setProperty(name, value);
  }
}

/** Tells the summary in `sheet`, if any, how much of it to reveal. */
export function writeReveal(sheet: HTMLElement, value: number): void {
  const fit = sheet.querySelector<HTMLElement>(FIT);
  if (fit) writeChanged(fit, '--sheet-reveal', String(value));
}

/**
 * Calls `place` now and whenever the sheet's body is swapped (the
 * summary, the picker, the calendar, the DSN sheet), so a summary that
 * arrives while the sheet rests gets its reveal; returns the unwatch
 * function.
 */
export function followBody(sheet: HTMLElement, place: () => void) {
  const observer = new MutationObserver(place);
  observer.observe(sheet, { childList: true });
  place();
  return (): void => observer.disconnect();
}
