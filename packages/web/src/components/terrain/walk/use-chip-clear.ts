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
 * Keeps the walk's chip and the view's caption apart (VENT-128): while the
 * chip would cover the caption (a phone at 200 % text), the stage says so
 * in `data-chip-over` and the caption steps aside until the chip goes or
 * the room comes back (on-foot.css). Measured whenever the chip, the
 * caption or the band they live in changes size.
 */
import { useEffect, type RefObject } from 'react';
import { chipCovers } from '../../../terrain/walk/chip-clear';

/** Whether `chip` covers the caption in `stage` now. */
function covers(chip: HTMLElement, stage: Element): boolean {
  const top = stage.querySelector('.on-foot__top');
  const caption = stage.querySelector('.on-foot__caption');
  if (!top || !caption) return false;
  return chipCovers(chip.getBoundingClientRect(),
    caption.getBoundingClientRect(), top.getBoundingClientRect());
}

/** Marks the chip's stage while the chip covers its caption. */
export function useChipClear(chip: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = chip.current;
    const stage = el?.closest<HTMLElement>('.on-foot__stage');
    if (!el || !stage) return undefined;
    const check = (): void => {
      stage.dataset['chipOver'] = String(covers(el, stage));
    };
    const observer = new ResizeObserver(check);
    const watched = [el, stage.querySelector('.on-foot__top'),
      stage.querySelector('.on-foot__caption')];
    for (const node of watched) if (node) observer.observe(node);
    check();
    return () => {
      observer.disconnect();
      delete stage.dataset['chipOver'];
    };
  }, [chip]);
}
