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
 * Measures what the free band (free-band.ts) is made of, off the frame
 * loop: the host's height, the phone's top bar and its tab bar. A
 * ResizeObserver watches all of them, so a font size change or a resize
 * re-measures once, and so does a move of the sheet; the frame loop never
 * reads layout.
 */
import type { FreeBandWatch } from './free-band';

/** The page's elements the band is measured from; null: not there. */
export interface BandAnchors {
  /** The phone's top bar: the band starts under it. */
  readonly bar: Element | null;
  /** The phone's tab bar: the band ends above it. */
  readonly tabs: Element | null;
}

export interface BandWatchParts {
  readonly host: HTMLElement;
  readonly band: Pick<FreeBandWatch, 'layout'>;
  readonly anchors: () => BandAnchors;
  /**
   * Calls back when the anchors may have come or gone (the phone shell
   * mounts after the globe: its sheet reports its edge); the unsubscribe.
   */
  readonly changes: (listener: () => void) => () => void;
}

/** The anchors on this page: the phone's top bar and tab bar. */
export function pageAnchors(host: HTMLElement): BandAnchors {
  const doc = host.ownerDocument;
  return {
    bar: doc.querySelector('.phone-bar'),
    tabs: doc.querySelector('.tab-bar'),
  };
}

/** `el`'s edges in px from `origin`'s top; null while it is not drawn. */
function edgesIn(el: Element | null, origin: DOMRect) {
  const rect = el?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return null;
  return { top: rect.top - origin.top, bottom: rect.bottom - origin.top };
}

/** Hands the band the host's height and the anchors' edges. */
function measureInto(parts: BandWatchParts, anchors: BandAnchors): void {
  const { host, band } = parts;
  const origin = host.getBoundingClientRect();
  band.layout({
    hostHeight: host.clientHeight,
    barBottom: edgesIn(anchors.bar, origin)?.bottom ?? 0,
    tabsTop: edgesIn(anchors.tabs, origin)?.top ?? Number.POSITIVE_INFINITY,
  });
}

/** The anchors on the page that are not observed yet. */
function unwatched(anchors: BandAnchors, watched: Set<Element>): Element[] {
  return Object.values(anchors)
    .filter((el): el is Element => el !== null && !watched.has(el));
}

/**
 * Keeps the band measured; returns how to stop. An anchor found inside the
 * observer's own callback is observed on the next frame, not there: the
 * bars sit above the host in the tree, and an element observed during a
 * delivery that shallow cannot be delivered in that loop, which the browser
 * reports as «ResizeObserver loop completed with undelivered
 * notifications» (VENT-51). It is measured at once all the same.
 */
export function watchBand(parts: BandWatchParts): () => void {
  const watched = new Set<Element>([parts.host]);
  let frame: number | null = null;
  const adopt = (): void => {
    frame = null;
    for (const el of unwatched(parts.anchors(), watched)) {
      watched.add(el);
      observer.observe(el);
    }
  };
  const measure = (): void => measureInto(parts, parts.anchors());
  const resized = (): void => {
    measure();
    const fresh = unwatched(parts.anchors(), watched).length > 0;
    if (fresh && frame === null) frame = requestAnimationFrame(adopt);
  };
  const observer = new ResizeObserver(resized);
  observer.observe(parts.host);
  const unsubscribe = parts.changes(() => (adopt(), measure()));
  return () => {
    if (frame !== null) cancelAnimationFrame(frame);
    observer.disconnect();
    unsubscribe();
  };
}
