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
 * The globe's words when it cannot draw (no WebGL, or blocked after a fault)
 * keep to the phone's free band between the top bar and the sheet or tab bar
 * (VENT-69), as the on-foot notice does: the band is written into the
 * paragraph's `--help-band-top` and `--help-band-height` (through the CSSOM,
 * so no style attribute meets the CSP) and followed as the sheet moves. When
 * the words do not fit (200 % text leaves the peek sheet almost no band) the
 * sheet is asked, once, to close.
 */
import { useEffect, useRef, type RefObject } from 'react';
import { pageAnchors } from '../globe/band-watch';
import { freeBand } from '../globe/free-band';
import type { WatchedValue } from '../lib/watched-value';

interface Parts {
  readonly help: RefObject<HTMLElement | null>;
  readonly host: RefObject<HTMLElement | null>;
  readonly sheetEdge: WatchedValue<number | null>;
  readonly roomAsk: WatchedValue<number>;
  /** The words are showing in place of the globe. */
  readonly on: boolean;
}

/** Writes the band into `help`; whether its words fit in it. */
function placeBand(help: HTMLElement, host: HTMLElement, edge: number | null) {
  const { bar, tabs } = pageAnchors(host);
  const origin = (help.offsetParent ?? host).getBoundingClientRect();
  const band = freeBand({
    hostHeight: origin.height,
    barBottom: Math.max((bar?.getBoundingClientRect().bottom ?? 0)
      - origin.top, 0),
    sheetTop: edge === null ? Number.POSITIVE_INFINITY : edge - origin.top,
    tabsTop: (tabs?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY)
      - origin.top,
  });
  const height = Math.max(band.bottom - band.top, 0);
  help.style.setProperty('--help-band-top', `${band.top}px`);
  help.style.setProperty('--help-band-height', `${height}px`);
  return bar === null || help.scrollHeight <= height;
}

/** Keeps the words in the free band; see the module's comment. */
export function useHelpBand(parts: Parts): void {
  const { help, host, sheetEdge, roomAsk, on } = parts;
  const asked = useRef(false);
  useEffect(() => {
    const el = help.current;
    const anchor = host.current;
    if (!on || !el || !anchor) return undefined;
    const follow = (): void => {
      const fits = placeBand(el, anchor, sheetEdge.get());
      if (fits || asked.current) return;
      asked.current = true;
      roomAsk.set(roomAsk.get() + 1);
    };
    follow();
    window.addEventListener('resize', follow);
    const off = sheetEdge.subscribe(follow);
    return () => {
      window.removeEventListener('resize', follow);
      off();
    };
  }, [help, host, sheetEdge, roomAsk, on]);
}
