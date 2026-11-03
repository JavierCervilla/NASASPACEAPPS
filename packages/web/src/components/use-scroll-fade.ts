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
 * The scroll edge fade of the desktop card (desktop/use-scroll-edges.ts,
 * apple-design §12) for any scroll box (VENT-55, C-10): spread the props on
 * the box, give it the `scroll-fade` class (styles/scroll-fade.css), and
 * the edge with content past it fades. A callback ref, so a box that
 * mounts after the component (an open popover, a month that loaded) is
 * watched too.
 */
import { useEffect, useState } from 'react';
import { scrollEdges, type ScrollEdges } from '../lib/scroll-edges';
import { watch } from './desktop/use-scroll-edges';

const NONE: ScrollEdges = { top: false, bottom: false };

/** The props a scroll box takes to fade the edges it hides content past. */
export function useScrollFade<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [edges, setEdges] = useState(NONE);
  useEffect(() => {
    if (!el) return undefined;
    const update = (): void => {
      const next = scrollEdges(el);
      setEdges((now) =>
        now.top === next.top && now.bottom === next.bottom ? now : next,
      );
    };
    update();
    return watch(el, update);
  }, [el]);
  return {
    ref: setEl,
    'data-fade-top': edges.top,
    'data-fade-bottom': edges.bottom,
  };
}
