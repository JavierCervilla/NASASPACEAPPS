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
 * Tells the phone widgets when the hour they show has passed: at the top
 * of each hour, and when a page that was hidden comes back in a later hour
 * (a hidden tab may hold its timers back). The clock, the timers and the
 * page visibility are injected.
 */
import { HOUR_MS } from '@ventana/sim';

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
 * Calls `onHour` each time the current UTC hour changes; returns the
 * function that stops watching.
 */
export function watchHour(
  deps: HourClockDeps,
  onHour: () => void,
): () => void {
  const hourOf = (ms: number): number => Math.floor(ms / HOUR_MS);
  let shown = hourOf(deps.now());
  let timer = 0;
  const check = (): void => {
    deps.clearTimer(timer);
    const hour = hourOf(deps.now());
    if (hour !== shown) {
      shown = hour;
      onHour();
    }
    timer = deps.setTimer(check, (hour + 1) * HOUR_MS - deps.now());
  };
  const unlisten = deps.page.onVisibilityChange(() => {
    if (deps.page.visible()) check();
  });
  timer = deps.setTimer(check, (shown + 1) * HOUR_MS - deps.now());
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
