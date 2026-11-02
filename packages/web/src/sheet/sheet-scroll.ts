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
 * When the half sheet's content outgrows even the full detent (a narrow
 * phone at 200 % text, VENT-44), the half sheet stops at full and its
 * content scrolls instead, so every line can be reached. Only then: a
 * content that fits keeps dragging the sheet (`data-sheet-scroll` makes a
 * press inside it scroll, never drag, components/phone/Sheet.tsx).
 */
import type { SheetLayout } from './sheet-physics';

/** Whether the half detent, raised for its content, passes the full one. */
function outgrowsFull(heightPx: number, layout: SheetLayout): boolean {
  return heightPx - layout.halfPx < layout.fullGapPx;
}

/**
 * Makes what `sheet` fits a scroll box when `outgrows`, its end kept
 * clear of `tabs` (`--tab-clear`, styles/phone.css); a no-op without it.
 */
function fitScroll(
  sheet: HTMLElement,
  tabs: HTMLElement | null,
  outgrows: boolean,
): void {
  const fit = sheet.querySelector<HTMLElement>('[data-sheet-fit]');
  if (!fit) return;
  if (fit.hasAttribute('data-sheet-scroll') !== outgrows) {
    fit.toggleAttribute('data-sheet-scroll', outgrows);
  }
  const top = tabs ? tabs.getBoundingClientRect().top : window.innerHeight;
  const below = window.innerHeight - top;
  fit.style.setProperty('--tab-clear', `${Math.ceil(below)}px`);
}

/**
 * The half sheet's height from `layout`, read so that each reading also
 * lets the content scroll, or not, in `sheet` over `tabs`.
 */
export function scrollingHalf(
  sheet: HTMLElement,
  tabs: HTMLElement | null,
  layout: () => SheetLayout,
): () => number {
  return () => {
    const now = layout();
    fitScroll(sheet, tabs, outgrowsFull(window.innerHeight, now));
    return now.halfPx;
  };
}
