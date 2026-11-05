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
 * (src/lib/dev-tools-loader.ts, VENT-49); and to the benchmark when the
 * address asks with `?bench` (src/lib/bench-loader.ts, VENT-81). Each is
 * asked for alone: `?bench` loads no dev tools. Without them nothing is
 * requested.
 */
import type { WebGLRenderer } from 'three';
import type { RendererHandle } from '../bench/renderer-watch';
import { benchModule } from '../lib/bench-loader';
import { devToolsModule } from '../lib/dev-tools-loader';

/** Attaches the renderer to the dev tools when they come. */
function toDevTools(handle: RendererHandle): () => void {
  let live = true;
  let detach: (() => void) | undefined;
  void devToolsModule()?.then(async ({ devTools, threeAdapter }) => {
    const tools = await devTools();
    const { renderer, textureBytes } = handle;
    const options = textureBytes ? { textureBytes } : {};
    if (live) detach = tools.attach(threeAdapter(renderer, options));
  });
  return () => {
    live = false;
    detach?.();
  };
}

/** Attaches the renderer to the benchmark when it comes. */
function toBench(handle: RendererHandle): () => void {
  let live = true;
  let detach: (() => void) | undefined;
  void benchModule()?.then(({ attachRenderer }) => {
    if (live) detach = attachRenderer(handle);
  });
  return () => {
    live = false;
    detach?.();
  };
}

/** Attaches `renderer` to whichever tools come; returns what detaches it. */
export function attachDevTools(
  renderer: WebGLRenderer,
  kind: RendererHandle['kind'],
  textureBytes?: () => number,
): () => void {
  const handle = { renderer, kind, ...(textureBytes ? { textureBytes } : {}) };
  const detach = [toDevTools(handle), toBench(handle)];
  return () => detach.forEach((fn) => fn());
}
