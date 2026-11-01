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
 * The selected site's terrain horizon as the page knows it (VENT-40),
 * re-rendering when it changes; a custom point's is asked for when the
 * point is selected. And the size of the box the strip draws in.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import type {
  HorizonStore,
  SiteHorizon,
} from '../../horizon/horizon-store';

/** The horizon of site `id`; asks the API for a custom point's. */
export function useSiteHorizon(store: HorizonStore, id: string): SiteHorizon {
  const { terrain } = store;
  useSyncExternalStore(terrain.subscribe, terrain.get, terrain.get);
  useEffect(() => store.request(id), [store, id]);
  return store.of(id);
}

export interface BoxSize {
  readonly width: number;
  readonly height: number;
  /** The element's font size, px, which follows the text size. */
  readonly fontPx: number;
}

const UNMEASURED: BoxSize = { width: 0, height: 0, fontPx: 10 };

/**
 * A ref to attach, and the element's content box and font size (0 by 0
 * until measured).
 */
export function useBoxSize<T extends HTMLElement>(): [
  RefObject<T | null>,
  BoxSize,
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(UNMEASURED);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => {
      const [width, height] = [el.clientWidth, el.clientHeight];
      const fontPx = parseFloat(getComputedStyle(el).fontSize) || 10;
      setSize((was) =>
        was.width === width && was.height === height && was.fontPx === fontPx
          ? was
          : { width, height, fontPx },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}
