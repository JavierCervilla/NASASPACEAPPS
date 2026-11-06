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

// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { basisTranscoder } from './scripts/basis-transcoder.mjs';
import { serviceWorker } from './scripts/service-worker.mjs';

// Served at the domain root on Dokploy; SITE_BASE sets a sub-path if a host ever needs one.
const base = process.env.SITE_BASE ?? '/';
// The public address, when known, makes the hreflang links absolute.
const site = process.env.SITE_URL;

export default defineConfig({
  base,
  ...(site ? { site } : {}),
  output: 'static',
  // The service worker (VENT-28) is bundled after the build, from what it built: the KTX2 transcoder (VENT-101) is
  // copied into dist first.
  integrations: [react(), basisTranscoder(base), serviceWorker()],
  vite: {
    build: {
      // The globe chunk (Three.js, about 540 kB minified, 135 kB gzip) is
      // over Vite's 500 kB default; it loads lazily, on desktop only.
      chunkSizeWarningLimit: 600,
    },
  },
});
