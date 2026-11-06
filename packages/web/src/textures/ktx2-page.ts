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
 * This page's KTX2 transcoder (VENT-101): one worker for the globe and the
 * on-foot view, made the first time a map or the early start needs it. A
 * classic worker (no `type: 'module'`), so it can load three's transcoder
 * with `importScripts`; Vite emits it as `_astro/basis-worker…js`, the file
 * nginx gives its own CSP.
 */
import type { Ktx2LoadDeps } from './ktx2-load';
import { transcoderClient } from './ktx2-transcoder';

export const pageTranscoder = transcoderClient(
  () => new Worker(new URL('./basis-worker.ts', import.meta.url)),
  {
    after: (ms, fn) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
  },
);

/** A file's bytes; rejects on an HTTP error. */
export async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

/** What a KTX2 load needs on this page, with `early` bytes if any. */
export function pageKtx2Deps(
  early: (url: string) => Promise<ArrayBuffer> | null = () => null,
): Ktx2LoadDeps {
  return { transcoder: pageTranscoder, bytes: fetchBytes, early };
}

