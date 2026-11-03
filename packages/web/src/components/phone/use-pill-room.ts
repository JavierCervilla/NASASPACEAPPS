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
 * The room the phone's site pill needs before its site name (VENT-55,
 * V-02): its dot, chevron, padding and gaps, plus its state's longest
 * line. The bar keeps that much for the pill and gives the titles the
 * rest, so a long saved name shortens with an ellipsis before «Ventana
 * Lunar» or the rule wraps; the titles still wrap before the state drops
 * «left» (FitLine.tsx). Written as `--pill-need` on the pill's parent,
 * the bar (CSSOM).
 */
import { useLayoutEffect, useRef, type RefObject } from 'react';

/** The pill's width without its names, plus its longest state line. */
function pillNeed(pill: HTMLElement): number | null {
  const names = pill.querySelector<HTMLElement>('.site-pill__names');
  const line = pill.querySelector<HTMLElement>('.fit-line__try');
  if (!names || !line) return null;
  return pill.offsetWidth - names.offsetWidth + line.offsetWidth;
}

/**
 * A ref for the pill; keeps `--pill-need` on its bar current as the pill
 * and its longest line resize, and again when its `key` (the lines) moves.
 */
export function usePillRoom<T extends HTMLElement>(
  key: string,
): RefObject<T | null> {
  const pill = useRef<T>(null);
  useLayoutEffect(() => {
    const el = pill.current;
    const bar = el?.parentElement;
    if (!el || !bar) return undefined;
    const update = (): void => {
      const need = pillNeed(el);
      if (need !== null) bar.style.setProperty('--pill-need', `${need}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const line = el.querySelector('.fit-line__try');
    if (line) observer.observe(line);
    update();
    return () => observer.disconnect();
  }, [key]);
  return pill;
}
