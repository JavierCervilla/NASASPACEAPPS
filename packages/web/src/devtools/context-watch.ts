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
 * Marks when the browser takes the WebGL context away (a GPU crash, or the
 * page over its GPU memory budget) and when it gives it back.
 *
 * Split out of breadcrumbs.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/breadcrumbs.ts`).
 */
import type { Breadcrumbs } from './breadcrumbs';

export type ContextEvent = 'lost' | 'restored';

/**
 * Watches a canvas for a lost and a restored context. The renderer is
 * expected to call `preventDefault` on the loss (Three.js does), which asks
 * for the restore.
 */
export function watchContext(
  canvas: EventTarget,
  crumbs: Breadcrumbs,
  onEvent?: (event: ContextEvent) => void,
): void {
  canvas.addEventListener('webglcontextlost', () => {
    crumbs.mark('context lost');
    onEvent?.('lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    crumbs.mark('context restored');
    onEvent?.('restored');
  });
}
