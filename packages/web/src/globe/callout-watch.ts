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

/**
 * Measures what the callout is placed with, off the frame loop: the
 * host's size, the card's size and the boxes of what it must not cover
 * (`avoid`: the Layers key on a desktop, the top bar and the tab bar on a
 * phone). A ResizeObserver watches all of them, so a new site, a font
 * size change or a resize re-measures once and asks for a frame; the
 * frame itself never reads layout.
 */
import type { Box } from '../callout/box';
import type { SiteCallout } from './site-callout';

export interface CalloutWatchParts {
  readonly host: HTMLElement;
  readonly callout: SiteCallout;
  /** The page's elements the card must not cover. */
  readonly avoid: () => readonly Element[];
  readonly invalidate: () => void;
}

/** `rect` in the coordinates of `origin`'s top left. */
function relative(rect: DOMRect, origin: DOMRect): Box {
  return {
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    right: rect.right - origin.left,
    bottom: rect.bottom - origin.top,
  };
}

/** Starts measuring; returns the unbind. */
export function watchCallout(parts: CalloutWatchParts): () => void {
  const { host, callout } = parts;
  const { card } = callout.dom;
  const watched = new Set<Element>([host, card]);
  const measure = (): void => {
    const elements = parts.avoid();
    for (const el of elements.filter((e) => !watched.has(e))) {
      watched.add(el);
      observer.observe(el);
    }
    const origin = host.getBoundingClientRect();
    const avoid = elements
      .map((el) => el.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => relative(rect, origin));
    const size = { width: card.offsetWidth, height: card.offsetHeight };
    const { clientWidth: width, clientHeight: height } = host;
    callout.layout({ width, height, size, avoid });
    parts.invalidate();
  };
  const observer = new ResizeObserver(measure);
  for (const el of watched) observer.observe(el);
  return () => observer.disconnect();
}
