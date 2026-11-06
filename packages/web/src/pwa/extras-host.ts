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
 * The page's browser behind keep-extras.ts (VENT-95): the phone layout's
 * media query, the active service worker and the page's start.
 */
import { afterStart } from '../lib/after-start';
import { PHONE_QUERY } from '../lib/viewport';
import type { ExtrasHost } from './keep-extras';

/** The page's browser as an {@link ExtrasHost}. */
export function browserExtrasHost(
  container: ServiceWorkerContainer,
): ExtrasHost {
  const query = matchMedia(PHONE_QUERY);
  return {
    phone: () => query.matches,
    onLayoutChange: (run) => {
      query.addEventListener('change', run);
      return () => query.removeEventListener('change', run);
    },
    worker: async () => (await container.ready).active,
    afterStart: (run) => void afterStart(run, window),
  };
}
