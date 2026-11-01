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
 * The room the half sheet adds for what marks the site (VENT-39): the
 * half detent shows the name and the four widgets and does not scroll, so
 * a note under the name (`data-sheet-lift`) raises it by the note's
 * height and the gap before it, and the widgets stay above the tab bar
 * at any width and text size. Only marked sites carry such a note.
 */

/** The selector of what lifts the half sheet. */
const LIFT = '[data-sheet-lift]';

/** The px the half sheet rises for what `sheet` holds; 0 without it. */
export function halfLiftPx(sheet: HTMLElement): number {
  const lift = sheet.querySelector<HTMLElement>(LIFT);
  if (!lift) return 0;
  const parent = lift.parentElement;
  const gap = parent ? Number.parseFloat(getComputedStyle(parent).rowGap) : 0;
  return lift.getBoundingClientRect().height + (Number.isFinite(gap) ? gap : 0);
}

/** Keeps `sizes` on the element that lifts `sheet`, as it comes and goes. */
function followLift(sheet: HTMLElement, sizes: ResizeObserver): () => void {
  let watched: Element | null = null;
  return () => {
    const lift = sheet.querySelector(LIFT);
    if (lift === watched) return;
    if (watched) sizes.unobserve(watched);
    if (lift) sizes.observe(lift);
    watched = lift;
  };
}

/**
 * Calls `changed` whenever the lift of `sheet` changes: a marked site's
 * note comes or goes with the site or the view the sheet holds, or it
 * resizes (the text size, the width); returns the unwatch function.
 */
export function watchLift(
  sheet: HTMLElement,
  changed: () => void,
): () => void {
  let last = halfLiftPx(sheet);
  const check = (): void => {
    const now = halfLiftPx(sheet);
    if (now === last) return;
    last = now;
    changed();
  };
  const sizes = new ResizeObserver(check);
  const follow = followLift(sheet, sizes);
  const mutations = new MutationObserver(() => {
    follow();
    check();
  });
  mutations.observe(sheet, { childList: true, subtree: true });
  follow();
  return () => {
    mutations.disconnect();
    sizes.disconnect();
  };
}
