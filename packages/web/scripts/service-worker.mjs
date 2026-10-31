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

// The service worker's build step (VENT-28), an Astro integration: after `astro build` it lists the files the worker
// caches at install, hashes them into the build's digest (so the static cache's name changes with any of them, and a
// deploy never serves an older file from it), and bundles src/pwa/sw-worker.ts with both into dist/sw.js at the base.
//
// Cached at install: every locale's page (not the pseudo-locale's), the build's scripts and styles, the icons, the
// manifests, the phase frames, the thumbnails and the maps the globe and the polar map open with. The sharper maps
// (4K, 8K) are left to the runtime cache: the zoom asks for them, and most visits never do.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKER = fileURLToPath(new URL('../src/pwa/sw-worker.ts', import.meta.url));
const START_MAPS = new Set([
  'textures/moon-lroc-1k.jpg',
  'textures/moon-lroc-2k.jpg',
  'textures/moon-lola-normal-1k.jpg',
  'textures/moon-lola-normal-2k.jpg',
  'textures/moon-south-polar-2k.jpg',
]);
const WHOLE_FOLDERS = ['_astro/', 'icons/', 'thumbs/'];
const ROOT_FILES = new Set(['favicon.ico', 'favicon.svg']);
/** The pseudo-locale's folder (src/i18n/locales.ts): never offered, never cached. */
const PSEUDO = 'en-xa/';

function filesUnder(dir, root = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path, root);
    return [relative(root, path).split(sep).join('/')];
  });
}

/** Whether the worker caches `file` (a path under dist) at install. */
export function precached(file) {
  if (file.startsWith(PSEUDO) || file.endsWith('.map')) return false;
  if (file === 'index.html' || /^[a-z]{2}\/index\.html$/.test(file)) return true;
  if (file.endsWith('manifest.webmanifest')) return true;
  return START_MAPS.has(file) || ROOT_FILES.has(file) || WHOLE_FOLDERS.some((f) => file.startsWith(f));
}

/** The URL path under the scope a file is asked by: a page by its folder, `es/` for es/index.html. */
export const requestPath = (file) => file.replace(/(^|\/)index\.html$/, '$1');

/**
 * What the worker caches at install, as paths under the scope, and the build's digest: the sha256 of every one of
 * those files' path and bytes, in order.
 * @param {string} dist
 * @returns {{ precache: string[], digest: string }}
 */
export function precacheOf(dist) {
  const files = filesUnder(dist).filter(precached).sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(`${file}\0`).update(readFileSync(join(dist, file)));
  return { precache: files.map(requestPath), digest: hash.digest('hex') };
}

/** Bundles the worker into `dist/sw.js` with its config. */
async function bundle(dist, config) {
  const { build } = await import('vite');
  await build({
    configFile: false,
    logLevel: 'warn',
    define: { __SW_CONFIG__: JSON.stringify(config) },
    build: {
      outDir: dist,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: true,
      lib: { entry: WORKER, formats: ['iife'], name: 'ventanaSw', fileName: () => 'sw.js' },
    },
  });
}

/** The Astro integration: writes dist/sw.js after every build. */
export function serviceWorker() {
  return {
    name: 'ventana-service-worker',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const config = precacheOf(dist);
        await bundle(dist, config);
        logger.info(`sw.js: ${config.precache.length} files, cache ${config.digest.slice(0, 12)}`);
      },
    },
  };
}
