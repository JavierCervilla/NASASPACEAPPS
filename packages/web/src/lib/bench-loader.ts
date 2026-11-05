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
 * When the page loads the benchmark (VENT-81): only when the address asks
 * with `?bench`, once the page has started (after-start.ts), so its chunk
 * is never in a page's first load; without it nothing is requested. The
 * island's slot and the renderers' hook (globe/dev-hook.ts) both ask
 * through `benchModule`, which loads it once.
 */
import type * as Boot from '../bench/bench-boot';
import { afterStart, type IdleHost } from './after-start';
import { benchAsked } from './bench-param';

export type BenchModule = typeof Boot;

export interface BenchAsk {
  /** The address's query string. */
  readonly search: string;
  readonly host: IdleHost;
  readonly load: () => Promise<BenchModule>;
}

/** The benchmark's module as `ask` wants it; null when it is not wanted. */
export function loadBench(ask: BenchAsk): Promise<BenchModule> | null {
  if (!benchAsked(ask.search)) return null;
  return new Promise((resolve, reject) => {
    afterStart(() => void ask.load().then(resolve, reject), ask.host);
  });
}

let page: Promise<BenchModule> | null | undefined;

/** The page's benchmark, asked once; null when the page has none. */
export function benchModule(): Promise<BenchModule> | null {
  if (page === undefined) {
    page = loadBench({
      search: window.location.search,
      host: window,
      load: () => import('../bench/bench-boot'),
    });
  }
  return page;
}
