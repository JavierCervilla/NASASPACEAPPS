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
 * The room the peek sheet adds for its head (VENT-52): peek shows only
 * what is marked `data-sheet-peek` (the site's name, «Save» for a custom
 * point and the point's coordinates), so it rises until that head's
 * bottom clears the tab bar by 12 px, as the half sheet does with its
 * content (sheet-lift.ts): a «Save» button, long words and large text
 * all count. It never sinks below its usual height.
 */
import { TAB_GAP_PX, watchLift } from './sheet-lift';
import type { SheetMotion } from './sheet-motion';
import { SHEET_LAYOUT, type DetentName } from './sheet-physics';

/** The selector of what the peek sheet shows. */
const PEEK = '[data-sheet-peek]';

/**
 * The px the peek sheet must rise over `basePx` (its usual visible
 * height) for its head in `sheet` to clear `tabs`; 0 without either.
 */
export function peekLiftPx(
  sheet: HTMLElement,
  tabs: HTMLElement | null,
  basePx: number,
): number {
  const head = sheet.querySelector(PEEK);
  if (!head || !tabs) return 0;
  const below = window.innerHeight - tabs.getBoundingClientRect().top;
  // A scrolled summary (sheet-scroll.ts) still counts from its top.
  const scrolled = head.parentElement?.scrollTop ?? 0;
  const top = sheet.getBoundingClientRect().top;
  const reach = head.getBoundingClientRect().bottom + scrolled - top;
  return Math.max(0, Math.ceil(reach + TAB_GAP_PX + below - basePx));
}

/**
 * Moves a sheet that rests at peek (`state`) to peek again, through
 * `motion`, whenever the lift of its head over `tabs` changes: the head
 * or the tab bar resized, or another site's head came; returns the
 * unwatch function.
 */
export function watchPeek(
  sheet: HTMLElement,
  tabs: HTMLElement | null,
  state: { readonly detent: DetentName },
  motion: Pick<SheetMotion, 'moveTo'>,
): () => void {
  const measure = (): number => peekLiftPx(sheet, tabs, SHEET_LAYOUT.peekPx);
  return watchLift(sheet, tabs, measure, () => {
    if (state.detent === 'peek') motion.moveTo('peek');
  });
}
