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
 * Whether an element is cut by its parent's box (VENT-100): the phone's
 * band over the 3D view clips what it has no room for, and a notice is
 * better hidden than cut. Measured again whenever the parent or any of its
 * children changes size, or a child comes or goes (the caption, the far
 * chip), since any of them moves it.
 */
import { useLayoutEffect, useState, type RefObject } from 'react';

const SLACK_PX = 0.5;

/** Whether `el`'s box reaches past `parent`'s top or bottom. */
function outside(el: Element, parent: Element): boolean {
  const own = el.getBoundingClientRect();
  const room = parent.getBoundingClientRect();
  return own.top < room.top - SLACK_PX || own.bottom > room.bottom + SLACK_PX;
}

export function useCut(ref: RefObject<HTMLElement | null>): boolean {
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return undefined;
    const sizes = new ResizeObserver(() => setCut(outside(el, parent)));
    const watch = (): void => {
      sizes.disconnect();
      sizes.observe(parent);
      for (const child of parent.children) sizes.observe(child);
    };
    const children = new MutationObserver(watch);
    children.observe(parent, { childList: true });
    watch();
    return () => {
      sizes.disconnect();
      children.disconnect();
    };
  }, [ref]);
  return cut;
}
