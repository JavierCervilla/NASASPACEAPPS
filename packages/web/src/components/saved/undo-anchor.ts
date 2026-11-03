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
 * Where «Deleted … · Undo» stands (VENT-57, V-11, variant B): a gap above
 * the calendar strip on desktop, which it used to cover, and above the
 * tab bar on the phone. Both are measured, so a strip grown by large text
 * or a rotated phone move it too; with neither on screen the stylesheet's
 * own bottom holds (saved.css `--undo-bottom`).
 */
import { useLayoutEffect, type RefObject } from 'react';

/** What the row stands above: the desktop strip, the phone's tab bar. */
const ANCHORS = '.strip, .tab-bar';
const PROPERTY = '--undo-bottom';
/** Room between the row and what it stands above, px (the mockup's). */
export const ANCHOR_GAP_PX = 12;

export interface AnchorBox {
  readonly top: number;
  readonly height: number;
}

/**
 * The row's `bottom`, px from the viewport's bottom edge, for a viewport
 * `viewportHeight` px tall: a gap above the highest anchor on screen (a
 * height of 0 is a hidden one); null when none shows. Pure.
 */
export function anchorBottom(
  viewportHeight: number,
  boxes: readonly AnchorBox[],
): number | null {
  const tops = boxes.filter((box) => box.height > 0).map((box) => box.top);
  if (tops.length === 0) return null;
  return viewportHeight - Math.min(...tops) + ANCHOR_GAP_PX;
}

/** Writes `--undo-bottom` on `el` for the anchors' boxes now. */
function placeAbove(el: HTMLElement, anchors: readonly Element[]): void {
  const boxes = anchors.map((anchor) => anchor.getBoundingClientRect());
  const bottom = anchorBottom(window.innerHeight, boxes);
  if (bottom === null) el.style.removeProperty(PROPERTY);
  else el.style.setProperty(PROPERTY, `${bottom}px`);
}

/**
 * Keeps the row above its anchor while an offer is open. The place stays
 * when the offer closes, so the row leaves from where it stood.
 */
export function useUndoAnchor(
  row: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useLayoutEffect(() => {
    const el = row.current;
    if (!open || !el) return undefined;
    const anchors = [...document.querySelectorAll(ANCHORS)];
    const place = (): void => placeAbove(el, anchors);
    const observer = new ResizeObserver(place);
    for (const anchor of anchors) observer.observe(anchor);
    window.addEventListener('resize', place);
    place();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [row, open]);
}
