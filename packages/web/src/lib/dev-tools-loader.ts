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
 * When the page loads the dev tools, the performance readout, the
 * breadcrumbs and the context watch (VENT-49): at once in the dev server or
 * a build made with PUBLIC_PERF_HUD=1, as before, and in a production build
 * only when the address asks with `?debug` (any value, or none), once the
 * page has started (after-start.ts), so their chunk is never in a page's
 * first load. Without it nothing is requested. The page, the globe and the
 * on-foot view all ask through `devToolsModule`, which loads it once.
 */
import type * as Boot from '../devtools/boot';
import { afterStart, type IdleHost } from './after-start';

export type DevToolsModule = typeof Boot;

/** The address parameter that turns the dev tools on in production. */
export const DEBUG_PARAM = 'debug';

export interface DevToolsAsk {
  /** The dev server or a PUBLIC_PERF_HUD=1 build: the tools always load. */
  readonly devBuild: boolean;
  /** The address's query string. */
  readonly search: string;
  readonly host: IdleHost;
  readonly load: () => Promise<DevToolsModule>;
}

/** Whether the address asks for the dev tools. */
export const debugAsked = (search: string): boolean =>
  new URLSearchParams(search).has(DEBUG_PARAM);

/** The dev tools' module as `ask` wants it; null when it is not wanted. */
export function loadDevTools(
  ask: DevToolsAsk,
): Promise<DevToolsModule> | null {
  if (ask.devBuild) return ask.load();
  if (!debugAsked(ask.search)) return null;
  return new Promise((resolve, reject) => {
    afterStart(() => void ask.load().then(resolve, reject), ask.host);
  });
}

/** The dev server or a PUBLIC_PERF_HUD=1 build. */
const devBuild = (): boolean =>
  import.meta.env.DEV || import.meta.env.PUBLIC_PERF_HUD === '1';

/**
 * Whether this page runs with the dev tools: a dev build, or `?debug`.
 * Three then checks every shader it links (gl-renderer.ts, VENT-93).
 */
export const devToolsWanted = (): boolean =>
  devBuild() || debugAsked(window.location.search);

let page: Promise<DevToolsModule> | null | undefined;

/** The page's dev tools, asked once; null when the page has none. */
export function devToolsModule(): Promise<DevToolsModule> | null {
  if (page === undefined) {
    page = loadDevTools({
      devBuild: devBuild(),
      search: window.location.search,
      host: window,
      load: () => import('../devtools/boot'),
    });
  }
  return page;
}
