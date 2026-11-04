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
 * A watch for silence on one request (VENT-78): its signal aborts with the
 * caller's, or once nothing has arrived for STALL_MS since the last poke.
 */
/** Arms `fn` after `ms`; the returned function disarms it. */
export type Timer = (fn: () => void, ms: number) => () => void;

/** The longest silence a request may keep, ms. */
export const STALL_MS = 4000;

export const realTimer: Timer = (fn, ms) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

export interface Watch {
  readonly signal: AbortSignal;
  /** Something arrived: the silence starts again. */
  poke(): void;
  stop(): void;
  stalled(): boolean;
}

/** A signal that aborts with `outer`, or after STALL_MS of silence. */
export function watchSilence(outer: AbortSignal, timer: Timer): Watch {
  const inner = new AbortController();
  let stalled = false;
  let disarm = (): void => undefined;
  const follow = (): void => inner.abort(outer.reason);
  if (outer.aborted) follow();
  outer.addEventListener('abort', follow, { once: true });
  return {
    signal: inner.signal,
    poke: () => {
      disarm();
      disarm = timer(() => {
        stalled = true;
        inner.abort();
      }, STALL_MS);
    },
    stop: () => {
      disarm();
      outer.removeEventListener('abort', follow);
    },
    stalled: () => stalled,
  };
}
