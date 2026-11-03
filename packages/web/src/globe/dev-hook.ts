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
 * Hands a renderer, the globe's or the on-foot view's, to the dev tools
 * (performance readout, context watch) when the page has them: the dev
 * server, a PUBLIC_PERF_HUD=1 build, or `?debug` once the page has started
 * (src/lib/dev-tools-loader.ts, VENT-49). Without them nothing is requested.
 */
import type { WebGLRenderer } from 'three';
import { devToolsModule } from '../lib/dev-tools-loader';

/** Attaches `renderer` when the tools come; returns what detaches it. */
export function attachDevTools(
  renderer: WebGLRenderer,
  textureBytes?: () => number,
): () => void {
  let live = true;
  let detach: (() => void) | undefined;
  void devToolsModule()?.then(async ({ devTools, threeAdapter }) => {
    const tools = await devTools();
    const options = textureBytes ? { textureBytes } : {};
    if (live) detach = tools.attach(threeAdapter(renderer, options));
  });
  return () => {
    live = false;
    detach?.();
  };
}
