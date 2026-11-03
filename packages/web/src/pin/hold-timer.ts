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
 * The hold's timer (VENT-37, VENT-52). A busy main thread fires a timer
 * late, and the pointer moves the browser queued meanwhile are delivered
 * only after it: a late timer cannot tell a still finger from one that was
 * turning the globe. So a timer that fires more than {@link HOLD_LATE_MS}
 * late waits the whole hold again, counting only the stillness the page
 * saw; the queued moves, delivered in that wait, end the press as a drag.
 */

/** How late the hold's timer may fire and still be trusted, ms. */
export const HOLD_LATE_MS = 250;

export interface HoldClock {
  /** Calls `fn` once after `ms`; returns how to call it off. */
  readonly after: (fn: () => void, ms: number) => () => void;
  /** The time now, ms, on the clock `after` keeps. */
  readonly now: () => number;
}

/**
 * Calls `fn` once the timer fired no later than {@link HOLD_LATE_MS} after
 * `ms`, starting again as often as it fires late; returns the call-off.
 */
export function armHold(
  clock: HoldClock,
  fn: () => void,
  ms: number,
): () => void {
  let stop = (): void => undefined;
  const wait = (): void => {
    const due = clock.now() + ms;
    stop = clock.after(() => {
      if (clock.now() - due > HOLD_LATE_MS) wait();
      else fn();
    }, ms);
  };
  wait();
  return () => stop();
}
