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
 * Starts the dev tools once per page. Nothing imports this module but
 * src/lib/dev-tools-loader.ts, with a dynamic import: at once in the dev
 * server and a PUBLIC_PERF_HUD=1 build, on `?debug` after the page has
 * started in a production build (VENT-49). A renderer reaches the same
 * instance through the loader and calls `attach` on it (globe/dev-hook.ts):
 *
 *   const { devTools, threeAdapter } = await devToolsModule();
 *   (await devTools()).attach(threeAdapter(renderer));
 */
import { DevTools } from './dev-tools';
import { detectTier, deviceHints } from '../lib/quality';

export { threeAdapter } from './renderer';

let started: Promise<DevTools> | null = null;

export function devTools(): Promise<DevTools> {
  started ??= start();
  return started;
}

async function start(): Promise<DevTools> {
  // A throwaway context tells the GPU's name; it is given back at once,
  // since a device allows few contexts.
  const probe = document.createElement('canvas').getContext('webgl2');
  const device = deviceHints(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const { search, hash } = window.location;
  const tier = detectTier(device, search, hash);
  // Folded on every screen: open, the panel covers the page's controls
  // (VENT-51); perf-hud.css keeps the folded line over the header's title.
  const tools = await DevTools.start(
    { tier, gpu: device.gpu, hash, folded: true });
  tools.run();
  return tools;
}
