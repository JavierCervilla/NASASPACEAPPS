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
 * Tells when a step of the clock (an hour, a minute) has passed: at each
 * step's boundary, and when a page that was hidden comes back in a later
 * step (a hidden tab may hold its timers back). The clock, the timers and
 * the page visibility are injected.
 */

export interface HourClockDeps {
  readonly now: () => number;
  readonly setTimer: (fn: () => void, ms: number) => number;
  readonly clearTimer: (id: number) => void;
  readonly page: {
    readonly visible: () => boolean;
    /** Calls `fn` on every visibility change; returns the unsubscribe. */
    readonly onVisibilityChange: (fn: () => void) => () => void;
  };
}

/**
 * Calls `onStep` each time the clock enters a new step of `stepMs` (from
 * the Unix epoch, so whole UTC hours or minutes); returns the function
 * that stops watching.
 */
export function watchClock(
  deps: HourClockDeps,
  stepMs: number,
  onStep: () => void,
): () => void {
  let shown = Math.floor(deps.now() / stepMs);
  let timer = 0;
  const check = (): void => {
    deps.clearTimer(timer);
    const step = Math.floor(deps.now() / stepMs);
    if (step !== shown) {
      shown = step;
      onStep();
    }
    timer = deps.setTimer(check, (step + 1) * stepMs - deps.now());
  };
  check();
  const unlisten = deps.page.onVisibilityChange(() => {
    if (deps.page.visible()) check();
  });
  return () => {
    deps.clearTimer(timer);
    unlisten();
  };
}

/** The browser's clock, timers and `document` visibility. */
export function browserHourClock(): HourClockDeps {
  return {
    now: () => Date.now(),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (id) => window.clearTimeout(id),
    page: {
      visible: () => document.visibilityState === 'visible',
      onVisibilityChange: (fn) => {
        document.addEventListener('visibilitychange', fn);
        return () => document.removeEventListener('visibilitychange', fn);
      },
    },
  };
}
