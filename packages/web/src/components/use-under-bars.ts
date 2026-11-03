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
 * Keeps a floating notice under the lowest top bar on screen (the desktop
 * header or the phone's glass bar), measured, so large text never puts it
 * over the site pill: the offline notice and «New version ready» share
 * that slot.
 */
import { useEffect, type RefObject } from 'react';

/** The top bars: the desktop header and the phone's glass bar. */
const BARS = 'header.bar, .phone-bar';
const GAP_PX = 8;

/** Keeps `note` GAP_PX under the lowest top bar on screen while shown. */
export function useUnderBars(
  note: RefObject<HTMLElement | null>,
  shown: boolean,
): void {
  useEffect(() => {
    const el = note.current;
    if (!shown || !el) return undefined;
    const bars = [...document.querySelectorAll(BARS)];
    const place = (): void => {
      const bottoms = bars
        .map((bar) => bar.getBoundingClientRect())
        .filter((box) => box.height > 0)
        .map((box) => box.bottom);
      el.style.setProperty('--top', `${Math.max(0, ...bottoms) + GAP_PX}px`);
    };
    const observer = new ResizeObserver(place);
    for (const bar of bars) observer.observe(bar);
    place();
    return () => observer.disconnect();
  }, [note, shown]);
}
