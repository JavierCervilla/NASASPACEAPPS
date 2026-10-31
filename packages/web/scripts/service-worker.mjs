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
// caches at install, hashes every file it may keep into the build's digest (so the static cache's name changes with
// any of them, and a deploy never serves an older file from it), and bundles src/pwa/sw-worker.ts with both into
// dist/sw.js at the base.
//
// Cached at install, the whole offline set: every locale's page (not the pseudo-locale's), the build's scripts and
// styles, the manifests, the icons with the 30 phase frames, every site thumbnail, the 1K and 2K maps, the polar
// map and the astronaut's model. The sharper maps (4K, 8K) are left to the runtime cache: the zoom asks for them, and most visits never do.
// The install set has a hard budget, PRECACHE_BUDGET: a build over it fails (human decision, 2026-10-31: under 5 MB
// is fine for this app).
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
const ROOT_FILES = new Set(['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']);
/** The astronaut's model (VENT-10): the dock draws it offline too. */
const MODELS = new Set(['models/astronaut.glb', 'models/astronaut-suit.webp']);
/** The pseudo-locale's folder (src/i18n/locales.ts): never offered, never cached. */
const PSEUDO = 'en-xa/';

function filesUnder(dir, root = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path, root);
    return [relative(root, path).split(sep).join('/')];
  });
}

/** Whether the worker may keep `file` (a path under dist) at all: not the pseudo-locale, source maps nor itself. */
const keepable = (file) => !file.startsWith(PSEUDO) && !file.endsWith('.map') && file !== 'sw.js';

/** The most the install may download, in bytes; the build fails over it. */
export const PRECACHE_BUDGET = 5 * 1024 * 1024;

/** Whether the worker caches `file` (a path under dist) at install: the offline set. */
export function precached(file) {
  if (!keepable(file)) return false;
  if (file === 'index.html' || /^[a-z]{2}\/index\.html$/.test(file)) return true;
  if (file.endsWith('manifest.webmanifest')) return true;
  if (MODELS.has(file)) return true;
  return START_MAPS.has(file) || ROOT_FILES.has(file) || WHOLE_FOLDERS.some((f) => file.startsWith(f));
}

/** The URL path under the scope a file is asked by: a page by its folder, `es/` for es/index.html. */
export const requestPath = (file) => file.replace(/(^|\/)index\.html$/, '$1');

/**
 * What the worker caches at install, as paths under the scope, their total size in bytes, and the build's digest: the
 * sha256 of the path and bytes of every file it may keep, at install or later, in order.
 * @param {string} dist
 * @returns {{ precache: string[], bytes: number, digest: string }}
 */
export function precacheOf(dist) {
  const files = filesUnder(dist).filter(keepable).sort();
  const hash = createHash('sha256');
  let bytes = 0;
  for (const file of files) {
    const body = readFileSync(join(dist, file));
    hash.update(`${file}\0`).update(body);
    if (precached(file)) bytes += body.length;
  }
  return { precache: files.filter(precached).map(requestPath), bytes, digest: hash.digest('hex') };
}

/** `bytes` in megabytes (MiB), two decimals. */
export const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/**
 * Throws when the install would download more than `budget` bytes, so the build fails instead of shipping it.
 * @param {number} bytes
 * @param {number} [budget]
 */
export function assertPrecacheBudget(bytes, budget = PRECACHE_BUDGET) {
  if (bytes > budget) {
    throw new Error(`sw.js: the precache is ${megabytes(bytes)} (${bytes} bytes), over its ${megabytes(budget)} budget`);
  }
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
        const { precache, bytes, digest } = precacheOf(dist);
        assertPrecacheBudget(bytes);
        await bundle(dist, { precache, digest });
        logger.info(
          `sw.js: ${precache.length} files, precache ${megabytes(bytes)} of ${megabytes(PRECACHE_BUDGET)}, ` +
            `cache ${digest.slice(0, 12)}`,
        );
      },
    },
  };
}
