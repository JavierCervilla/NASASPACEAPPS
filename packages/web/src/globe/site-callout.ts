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
 * The selected site's callout on the globe, riding next to its marker
 * inside the part of the globe the page leaves visible (on a phone, above
 * the bottom sheet's top edge, which moves with every drag), with a thin
 * leader to the marker. It hides with its marker: behind the limb or
 * under the sheet. Each frame only writes two transforms: the sizes it
 * places with are measured when they change (callout-watch.ts), never in
 * the frame.
 */
import type { Box, Point } from '../callout/box';
import type { CalloutContent } from '../callout/callout-content';
import { calloutDom, renderCallout, type CalloutDom } from '../callout/callout-dom';
import { placeCallout } from '../callout/callout-place';

/** Room the card keeps from the visible area's edges. */
const EDGE_GAP_PX = 8;

/** What the placement needs from the page, measured off the frame. */
export interface CalloutLayout {
  /** The host's size, px. */
  readonly width: number;
  readonly height: number;
  /** The visible area's bottom, px from the host's top; no sheet: none. */
  readonly bottom: number;
  /** The card's own size, px. */
  readonly size: { readonly width: number; readonly height: number };
  /** What the card must not cover, px in the host. */
  readonly avoid: readonly Box[];
}

export class SiteCallout {
  readonly dom: CalloutDom = calloutDom();
  private at: Point | null = null;
  private shown = false;
  private layoutNow: CalloutLayout = {
    width: 0,
    height: 0,
    bottom: Number.POSITIVE_INFINITY,
    size: { width: 0, height: 0 },
    avoid: [],
  };

  /** Shows `content` (the selected site at the instant); null: nothing. */
  show(content: CalloutContent | null): void {
    this.shown = content !== null;
    if (content) renderCallout(this.dom, content);
    this.draw();
  }

  /** Follows the marker at `at` (px in the host), or hides for null. */
  follow(at: Point | null): void {
    this.at = at;
    this.draw();
  }

  /** Takes in new measurements: any of the layout's fields. */
  layout(change: Partial<CalloutLayout>): void {
    this.layoutNow = { ...this.layoutNow, ...change };
    this.draw();
  }

  private draw(): void {
    const { card, leader } = this.dom;
    const { width, height, bottom, size, avoid } = this.layoutNow;
    const area = {
      left: EDGE_GAP_PX,
      top: EDGE_GAP_PX,
      right: width - EDGE_GAP_PX,
      bottom: Math.min(height, bottom) - EDGE_GAP_PX,
    };
    const at = this.shown ? this.at : null;
    const place = at && placeCallout({ at, size, area, avoid });
    card.dataset['shown'] = String(Boolean(place));
    leader.dataset['shown'] = card.dataset['shown'];
    if (!place) return;
    const { box, leader: line } = place;
    card.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
    leader.style.width = `${line.length}px`;
    leader.style.transform =
      `translate3d(${line.from.x}px, ${line.from.y}px, 0) ` +
      `rotate(${line.angleDeg}deg)`;
  }
}
