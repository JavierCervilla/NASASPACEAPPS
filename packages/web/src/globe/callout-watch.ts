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
 * Measures what the callout docks with, off the frame loop: the host's
 * size, the card's size, and the boxes it docks against (the Layers
 * key on a desktop; the top bar and the tab bar on a phone). A
 * ResizeObserver watches all of them, so a new site, a font size change
 * or a resize re-measures once; the frame loop never reads layout.
 */
import type { Box } from '../callout/callout-dock';
import type { SiteCallout } from './site-callout';

/** The page's elements the callout docks against; null: not there. */
export interface CalloutAnchors {
  /** The globe's Layers key: the desktop card stands above it. */
  readonly layers: Element | null;
  /** The phone's top bar: the card hides rather than reach it. */
  readonly bar: Element | null;
  /** The phone's tab bar: the card stands above it. */
  readonly tabs: Element | null;
}

export interface CalloutWatchParts {
  readonly host: HTMLElement;
  readonly callout: SiteCallout;
  readonly anchors: () => CalloutAnchors;
  /** Whether the phone layout applies now (PHONE_QUERY). */
  readonly phone: () => boolean;
}

/**
 * The anchors on this page: the globe's own Layers key (the host's
 * sibling, not the polar map's), the phone's top bar and tab bar.
 */
export function pageAnchors(host: HTMLElement): CalloutAnchors {
  const doc = host.ownerDocument;
  return {
    layers: host.parentElement?.querySelector(':scope > .globe-layers') ?? null,
    bar: doc.querySelector('.phone-bar'),
    tabs: doc.querySelector('.tab-bar'),
  };
}

/** `el`'s box in px from `origin`'s top left; null while it is not drawn. */
function boxIn(el: Element | null, origin: DOMRect): Box | null {
  const rect = el?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return null;
  return {
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    right: rect.right - origin.left,
    bottom: rect.bottom - origin.top,
  };
}

/** Hands the callout the sizes and the anchors' boxes it docks with. */
function measureInto(parts: CalloutWatchParts, anchors: CalloutAnchors) {
  const { host, callout } = parts;
  const origin = host.getBoundingClientRect();
  const top = boxIn(anchors.tabs, origin)?.top;
  callout.layout({
    phone: parts.phone(),
    hostWidth: host.clientWidth,
    hostHeight: host.clientHeight,
    cardWidth: callout.dom.card.offsetWidth,
    cardHeight: callout.dom.card.offsetHeight,
    tabsTop: top ?? Number.POSITIVE_INFINITY,
    barBottom: boxIn(anchors.bar, origin)?.bottom ?? 0,
    layers: boxIn(anchors.layers, origin),
  });
}

/** Keeps the callout measured; returns how to stop. */
export function watchCallout(parts: CalloutWatchParts): () => void {
  const { host, callout } = parts;
  const { card } = callout.dom;
  const watched = new Set<Element>([host, card]);
  const measure = (): void => {
    const anchors = parts.anchors();
    for (const el of Object.values(anchors)) {
      if (!el || watched.has(el)) continue;
      watched.add(el);
      observer.observe(el);
    }
    measureInto(parts, anchors);
  };
  const observer = new ResizeObserver(measure);
  for (const el of watched) observer.observe(el);
  return () => observer.disconnect();
}
