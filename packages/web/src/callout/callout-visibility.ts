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
 * Whether the callout shows. Losing its marker (behind the limb, under
 * the phone sheet) hides it at once and a first sighting shows it at
 * once; but a change the keep-clear rules ask for (the marker under the
 * tab bar, every side covering something) waits until it has held for
 * {@link HOLD_MS}. A marker dragged along such a boundary otherwise made
 * the card blink on and off every frame (VENT-31). Pure: the time comes
 * in with each call.
 */

/** What the placement wants this frame. */
export type CalloutWish =
  /** A side is clear: show the card there. */
  | 'show'
  /** The keep-clear rules leave no room: hide it, after the hold. */
  | 'blocked'
  /** No marker to follow, or outside the visible area: hide at once. */
  | 'gone';

/** A change the keep-clear rules ask for must hold this long, ms. */
export const HOLD_MS = 100;

/** The card's visibility now, and whether a change is waiting. */
export interface VisibilityNow {
  readonly shown: boolean;
  /** True while a change holds: ask for another frame to settle it. */
  readonly waiting: boolean;
}

export class CalloutVisibility {
  private shown = false;
  /** Hidden by the keep-clear rules (not by losing the marker). */
  private blocked = false;
  /** When the waiting change was first asked for, ms; null: none. */
  private since: number | null = null;

  /** The visibility for `wish` at `now` (ms). */
  next(wish: CalloutWish, now: number): VisibilityNow {
    const want = wish === 'show';
    if (wish === 'gone' || want === this.shown) {
      this.since = null;
      if (wish === 'gone') [this.shown, this.blocked] = [false, false];
      return { shown: this.shown, waiting: false };
    }
    if (!this.shown && !this.blocked) return this.settle(true);
    this.since ??= now;
    if (now - this.since < HOLD_MS) return { shown: this.shown, waiting: true };
    return this.settle(want);
  }

  /** Forgets everything: a new site starts afresh. */
  reset(): void {
    [this.shown, this.blocked, this.since] = [false, false, null];
  }

  private settle(shown: boolean): VisibilityNow {
    [this.shown, this.blocked, this.since] = [shown, !shown, null];
    return { shown, waiting: false };
  }
}
