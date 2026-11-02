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
 * The room the half sheet adds for what it holds (VENT-39, VENT-40): the
 * half detent shows the site's summary and does not scroll, so it rises
 * until the summary's last line (`data-sheet-fit`, measured from its
 * content's bottom) clears the tab bar by 12 px, at any width, language
 * and text size: a shadow note, the horizon strip and long words all
 * count. It never sinks below its usual height.
 */

/** The selector of what the half sheet fits. */
const FIT = '[data-sheet-fit]';

/** Room kept between the content's bottom and the tab bar. */
const TAB_GAP_PX = 12;

/** The bottom of the lowest laid-out child of `el`, or its own. */
function contentBottom(el: Element): number {
  const boxes = [...el.children].map((child) => child.getBoundingClientRect());
  const shown = boxes.filter((box) => box.height > 0);
  if (shown.length === 0) return el.getBoundingClientRect().bottom;
  return Math.max(...shown.map((box) => box.bottom));
}

/**
 * The px the half sheet must rise over `basePx` (its usual visible
 * height) for what `sheet` holds to clear `tabs`; 0 without either.
 */
export function halfLiftPx(
  sheet: HTMLElement,
  tabs: HTMLElement | null,
  basePx: number,
): number {
  const fit = sheet.querySelector(FIT);
  if (!fit || !tabs) return 0;
  const below = window.innerHeight - tabs.getBoundingClientRect().top;
  // Scrolled (sheet-scroll.ts), the content still counts from its top.
  const scrolled = fit.scrollTop;
  const top = sheet.getBoundingClientRect().top;
  const reach = contentBottom(fit) + scrolled - top;
  return Math.max(0, Math.ceil(reach + TAB_GAP_PX + below - basePx));
}

/** Keeps `sizes` on what `sheet` fits, as it comes and goes. */
function followFit(sheet: HTMLElement, sizes: ResizeObserver): () => void {
  let watched: Element | null = null;
  return () => {
    const fit = sheet.querySelector(FIT);
    if (fit === watched) return;
    if (watched) sizes.unobserve(watched);
    if (fit) sizes.observe(fit);
    watched = fit;
  };
}

/** A check that calls `changed` when what `measure` reads has changed. */
function whenChanged(measure: () => number, changed: () => void) {
  let last = measure();
  return (): void => {
    const now = measure();
    if (now === last) return;
    last = now;
    changed();
  };
}

/**
 * Calls `changed` whenever the lift `measure` reads changes: the content
 * comes or goes with the site or the view the sheet holds, or it or the
 * tab bar resizes (the text size, the width); returns the unwatch
 * function.
 */
export function watchLift(
  sheet: HTMLElement,
  tabs: HTMLElement | null,
  measure: () => number,
  changed: () => void,
): () => void {
  // Without content to fit the sheet is leaving half (for the picker or
  // the calendar at full): nothing to move it back for.
  const check = whenChanged(measure, () => {
    if (sheet.querySelector(FIT)) changed();
  });
  const sizes = new ResizeObserver(check);
  if (tabs) sizes.observe(tabs);
  const follow = followFit(sheet, sizes);
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
