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
 * The scroll edges of an element (lib/scroll-edges.ts), kept current as it
 * scrolls, resizes or its content changes.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { scrollEdges, type ScrollEdges } from '../../lib/scroll-edges';

const NONE: ScrollEdges = { top: false, bottom: false };

/**
 * Calls `update` whenever `el` scrolls, resizes or its content changes
 * (the card grows as the month loads); returns the way to stop.
 */
export function watch(el: HTMLElement, update: () => void): () => void {
  el.addEventListener('scroll', update, { passive: true });
  const sizes = new ResizeObserver(update);
  sizes.observe(el);
  const content = new MutationObserver(update);
  content.observe(el, { childList: true, subtree: true });
  return () => {
    el.removeEventListener('scroll', update);
    sizes.disconnect();
    content.disconnect();
  };
}

/** A ref to attach, and which of its edges have content past them. */
export function useScrollEdges<T extends HTMLElement>(): [
  RefObject<T | null>,
  ScrollEdges,
] {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState(NONE);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = (): void => {
      const next = scrollEdges(el);
      setEdges((now) =>
        now.top === next.top && now.bottom === next.bottom ? now : next,
      );
    };
    update();
    return watch(el, update);
  }, []);
  return [ref, edges];
}
