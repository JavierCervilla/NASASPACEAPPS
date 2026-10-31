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
 * Registers the service worker (sw-worker.ts) at the site's base, so its
 * scope is every locale's page. Production builds only: the dev server
 * has no `sw.js`, and a worker there would serve stale modules.
 */

/** The worker's address and scope under `base`. */
export function workerAt(base: string): { url: string; scope: string } {
  const scope = base.replace(/\/?$/, '/');
  return { url: `${scope}sw.js`, scope };
}

/** Registers the worker when the browser has them; a failure is quiet. */
export function registerServiceWorker(
  base: string,
  container: ServiceWorkerContainer | undefined,
): void {
  if (!container) return;
  const { url, scope } = workerAt(base);
  container.register(url, { scope }).catch((error: unknown) => {
    console.warn(`Ventana Lunar: no offline mode (${String(error)}).`);
  });
}
