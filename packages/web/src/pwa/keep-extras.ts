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
 * The page's half of the device extras (VENT-95): the install set leaves
 * out the maps a phone never uses (the 2K start maps and the polar map),
 * so a page in the desktop layout asks the worker to keep them once it
 * has started, on every start (the worker asks nothing for what it
 * keeps). A phone-sized page asks only if it turns into the desktop
 * layout (a tablet turned to landscape, a window widened).
 */
import { KEEP_EXTRAS } from './sw-extras';

/** The browser this needs, injected so tests drive it. */
export interface ExtrasHost {
  /** Whether the page is in the phone layout now. */
  readonly phone: () => boolean;
  /** Calls `run` on each layout change; returns a stop. */
  readonly onLayoutChange: (run: () => void) => () => void;
  /** The active worker, once there is one; null without. */
  readonly worker: () => Promise<{
    postMessage(message: unknown): void;
  } | null>;
  /** Runs `run` once the page has started. */
  readonly afterStart: (run: () => void) => void;
}

/** Asks the active worker to keep the desktop's set. */
async function askDesktopSet(host: ExtrasHost): Promise<void> {
  const worker = await host.worker();
  worker?.postMessage({ type: KEEP_EXTRAS, set: 'desktop' });
}

/** Asks for the desktop's extras once the page is in that layout. */
export function keepDeviceExtras(host: ExtrasHost): void {
  host.afterStart(() => {
    if (!host.phone()) {
      void askDesktopSet(host);
      return;
    }
    const stop = host.onLayoutChange(() => {
      if (host.phone()) return;
      stop();
      void askDesktopSet(host);
    });
  });
}
