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
 * Fits the polar disk beside the keys floating in its panel (the Layers
 * key, the numbered sites; polar/disk-fit.ts), whenever the panel or a
 * key changes size: the disk's side and centre go to `--disk` and
 * `--disk-shift` on the panel.
 */
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { fitDisk, type KeyBox } from '../../polar/disk-fit';

const KEYS = '.globe-layers, .polar-key';
/** Changes smaller than this are left alone, so the fit never jitters. */
const STILL_PX = 3;

/** The boxes of the panel's shown keys, in panel px. */
function keyBoxes(panel: HTMLElement): KeyBox[] {
  const origin = panel.getBoundingClientRect();
  return [...panel.querySelectorAll<HTMLElement>(KEYS)]
    .map((key) => key.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0)
    .map((box) => ({
      left: box.left - origin.left,
      top: box.top - origin.top,
      right: box.right - origin.left,
      bottom: box.bottom - origin.top,
    }));
}

/** Sets the fit on `panel` when it moved by more than {@link STILL_PX}. */
function apply(panel: HTMLElement, last: { size: number; shift: number }) {
  const { width, height } = panel.getBoundingClientRect();
  const fit = fitDisk({ width, height }, keyBoxes(panel));
  const shift = fit.centreX - width / 2;
  const moved = Math.abs(fit.size - last.size) + Math.abs(shift - last.shift);
  if (moved < STILL_PX) return;
  Object.assign(last, { size: fit.size, shift });
  panel.style.setProperty('--disk', `${fit.size}px`);
  panel.style.setProperty('--disk-shift', `${shift}px`);
}

/** The panel's ref, its disk fitted while it is on the page. */
export function useDiskFit(): RefObject<HTMLElement | null> {
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = panel.current;
    if (!el) return undefined;
    const last = { size: 0, shift: 0 };
    const fit = (): void => apply(el, last);
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    const watchKeys = (): void => {
      el.querySelectorAll(KEYS).forEach((key) => observer.observe(key));
    };
    watchKeys();
    const added = new MutationObserver(watchKeys);
    added.observe(el, { childList: true });
    fit();
    return () => {
      observer.disconnect();
      added.disconnect();
    };
  }, [panel]);
  return panel;
}
