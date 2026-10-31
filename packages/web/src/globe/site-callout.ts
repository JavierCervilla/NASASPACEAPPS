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
 * The selected site's callout on the globe: a card docked at the bottom
 * left (callout-dock.ts), still while the globe turns. On a phone it rides
 * the sheet's top edge, so it moves with every drag of the sheet, and only
 * then: the frame loop never touches it. It shows the selected site even
 * with its marker behind the limb; the pulsing ring on the marker
 * (marker-layer.ts) says where the site is.
 */
import type { CalloutContent } from '../callout/callout-content';
import {
  fitCallout,
  type CalloutFit,
  type CalloutLayout,
} from '../callout/callout-dock';
import {
  calloutDom,
  renderCallout,
  type CalloutDom,
} from '../callout/callout-dom';

import type { FreeBand } from './site-aim';

export type { CalloutLayout } from '../callout/callout-dock';

export class SiteCallout {
  readonly dom: CalloutDom = calloutDom();
  private content: CalloutContent | null = null;
  private readonly listeners = new Set<() => void>();
  private fit: CalloutFit = { dock: null, compact: false, fullHeight: 0 };
  private layoutNow: CalloutLayout = {
    phone: false,
    hostWidth: 0,
    hostHeight: 0,
    cardWidth: 0,
    cardHeight: 0,
    sheetTop: Number.POSITIVE_INFINITY,
    tabsTop: Number.POSITIVE_INFINITY,
    barBottom: 0,
    layers: null,
  };

  /** Shows `content` (the selected site at the instant); null: nothing. */
  show(content: CalloutContent | null): void {
    this.content = content;
    if (content) renderCallout(this.dom, content);
    this.draw();
  }

  /** Takes in new measurements: any of the layout's fields. */
  layout(change: Partial<CalloutLayout>): void {
    this.layoutNow = { ...this.layoutNow, ...change };
    this.draw();
  }

  /**
   * Where a framed marker stays clear of the top bar and of the shown
   * card, when the card spans the view's middle (a phone's): above it.
   */
  band(): FreeBand {
    const { barBottom, hostWidth, hostHeight, cardWidth } = this.layoutNow;
    const dock = this.content ? this.fit.dock : null;
    const middle = hostWidth / 2;
    const spans =
      dock !== null && dock.left < middle && dock.left + cardWidth > middle;
    const top = spans ? dock.bottom - this.layoutNow.cardHeight : hostHeight;
    return { top: barBottom, bottom: top };
  }

  /** Calls `listener` after every draw; returns how to stop. */
  watch(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  private draw(): void {
    const { card } = this.dom;
    if (this.content) this.fit = fitCallout(this.layoutNow, this.fit);
    const dock = this.content ? this.fit.dock : null;
    card.dataset['fit'] = this.fit.compact ? 'compact' : 'full';
    card.dataset['shown'] = String(dock !== null);
    for (const listener of this.listeners) listener();
    // Hidden, it stays where it last was, so it fades out in place.
    if (!dock) return;
    // The card is anchored to the host's bottom left (callout.css).
    const y = dock.bottom - this.layoutNow.hostHeight;
    const transform = `translate3d(${dock.left}px, ${y}px, 0)`;
    if (card.style.transform !== transform) card.style.transform = transform;
  }
}
