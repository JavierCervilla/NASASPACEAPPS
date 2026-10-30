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
 * the frame. It remembers the side it sits on and holds keep-clear hides
 * and shows for a moment, so a marker moving along a boundary does not
 * make the card jump or blink frame after frame (VENT-31).
 */
import type { Point } from '../callout/box';
import { placeInput, type CalloutLayout } from '../callout/callout-area';
import type { CalloutContent } from '../callout/callout-content';
import { calloutDom, renderCallout, type CalloutDom } from '../callout/callout-dom';
import { placeCallout, type CalloutSide } from '../callout/callout-place';
import { CalloutVisibility } from '../callout/callout-visibility';

export type { CalloutLayout } from '../callout/callout-area';

/** The time the callout's hold reads, and how it asks for a frame. */
export interface CalloutClock {
  /** ms, monotonic. */
  readonly now: () => number;
  /** Asks for another frame while a held change waits. */
  readonly wake: () => void;
}

export class SiteCallout {
  readonly dom: CalloutDom = calloutDom();
  private at: Point | null = null;
  private content: CalloutContent | null = null;
  private side: CalloutSide | null = null;
  private readonly visibility = new CalloutVisibility();
  private layoutNow: CalloutLayout = {
    width: 0,
    height: 0,
    bottom: Number.POSITIVE_INFINITY,
    size: { width: 0, height: 0 },
    avoid: [],
  };

  /** Without a `clock`, the page's clock and no frames asked for. */
  constructor(
    private readonly clock: CalloutClock = {
      now: () => performance.now(),
      wake: () => undefined,
    },
  ) {}

  /** Shows `content` (the selected site at the instant); null: nothing. */
  show(content: CalloutContent | null): void {
    if (content?.id !== this.content?.id) {
      this.visibility.reset();
      this.side = null;
    }
    this.content = content;
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
    const input = placeInput(this.layoutNow, this.content ? this.at : null);
    const place = input && placeCallout(input, this.side);
    const wish = !input ? 'gone' : place ? 'show' : 'blocked';
    const { shown, waiting } = this.visibility.next(wish, this.clock.now());
    if (waiting) this.clock.wake();
    card.dataset['shown'] = String(shown);
    leader.dataset['shown'] = card.dataset['shown'];
    // Shown while a hide holds: the card stays where it last was.
    if (!shown || !place) return;
    const { box, leader: line, side } = place;
    this.side = side;
    card.dataset['side'] = side;
    card.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
    leader.style.width = `${line.length}px`;
    leader.style.transform =
      `translate3d(${line.from.x}px, ${line.from.y}px, 0) ` +
      `rotate(${line.angleDeg}deg)`;
  }
}
