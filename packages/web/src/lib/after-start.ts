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
 * Work that may wait until the page has started: run once the browser is
 * idle after the first paint, or after `timeoutMs` at the latest, so it
 * never delays the globe's start (VENT-7: the DSN timeline and the Earth
 * picture cost a frame or more on a slow phone). Browsers without idle
 * callbacks (Safari) wait for a plain timer instead.
 */

/** The browser's timers this needs, injected so tests drive them. */
export interface IdleHost {
  readonly requestIdleCallback?: (
    run: () => void,
    options: { timeout: number },
  ) => number;
  readonly cancelIdleCallback?: (id: number) => void;
  readonly setTimeout: (run: () => void, ms: number) => number;
  readonly clearTimeout: (id: number) => void;
}

/** The latest the work waits for an idle moment, ms. */
export const START_TIMEOUT_MS = 2000;
/** Without idle callbacks: a pause that lets the first frames through. */
export const FALLBACK_DELAY_MS = 300;

/** Runs `run` once the page has started; returns a cancel. */
export function afterStart(
  run: () => void,
  host: IdleHost,
  timeoutMs = START_TIMEOUT_MS,
): () => void {
  const { requestIdleCallback: idle, cancelIdleCallback: cancel } = host;
  if (idle && cancel) {
    const id = idle(run, { timeout: timeoutMs });
    return () => cancel(id);
  }
  const id = host.setTimeout(run, Math.min(FALLBACK_DELAY_MS, timeoutMs));
  return () => host.clearTimeout(id);
}
