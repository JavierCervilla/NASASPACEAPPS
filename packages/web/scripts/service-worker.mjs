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
// any of them, and a deploy never serves an older file from it), hashes each of them on its own (so a new build copies
// the unchanged ones from the older build's cache instead of downloading them again, VENT-90), and bundles
// src/pwa/sw-worker.ts with all three into dist/sw.js at the base.
//
// Cached at install, the offline set every device uses: every locale's page (not the pseudo-locale's), the build's
// scripts and styles, the manifests, the icons with the 30 phase frames, every site thumbnail and the 1K maps. The maps
// only the desktop layout uses, the 2K start maps and the polar map (DEVICE_EXTRAS), are kept once a desktop page has
// started and asks for them (VENT-95: a phone opens on the 1K map, zooms from 1K to 4K and has no polar view). The
// sharper maps (4K, 8K) are left to the runtime cache: the zoom asks for them, and most visits never do. So are the
// on-foot 3D view's files (ON_DEMAND), which only that view asks for, and the dev tools, which only `?debug` asks for.
// What a first visit downloads has a hard budget, PRECACHE_BUDGET, counted on the largest one (the install set and the
// desktop extras): a build over it fails (human decision, 2026-10-31: under 5 MB is fine for this app).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKER = fileURLToPath(new URL('../src/pwa/sw-worker.ts', import.meta.url));
const START_MAPS = new Set(['textures/moon-lroc-1k.jpg', 'textures/moon-lola-normal-1k.jpg']);
/**
 * The files only some devices use, by the name of the set a page asks the worker to keep (src/pwa/keep-extras.ts):
 * the desktop's 2K start maps (src/globe/texture-lod.ts: the high tier opens on them, and a phone never runs it) and
 * its polar map (src/components/polar/PolarMap.tsx: the phone has no polar view). Never in the install set.
 */
export const DEVICE_EXTRAS = {
  desktop: ['textures/moon-lroc-2k.jpg', 'textures/moon-lola-normal-2k.jpg', 'textures/moon-south-polar-2k.jpg'],
};
const WHOLE_FOLDERS = ['_astro/', 'icons/', 'thumbs/'];
const ROOT_FILES = new Set(['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']);
/**
 * The on-foot 3D view's files (VENT-34): its panel, styles and scene download only when the view opens,
 * so they stay out of the install set; the worker keeps them cache first the first time the page asks for them.
 */
// The dev tools' chunk and styles (boot, perf-hud) are only asked for by `?debug` (VENT-49), and Spector.js, in a
// PUBLIC_PERF_HUD=1 build, only by `#stats-spector`. The benchmark's chunk and styles (bench-boot, bench.css) are
// only asked for by `?bench` (VENT-81); the small bench-param chunk is the page's own: it fixes the instant.
// The fine real-relief tiles (VENT-62, public/fine-tiles/) are on demand too: only a view of a point inside one asks for
// its two files (about 84 to 123 kB), and the worker keeps them cache first from then on.
const ON_DEMAND = /^(_astro\/(TerrainPanel|terrain-scene|on-foot|boot|perf-hud|spector|bench-boot)[.-][^/]+|_astro\/bench\.[^/]+\.css|fine-tiles\/.+)$/;
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

/** The most a first visit's worker may download, in bytes; the build fails over it. */
export const PRECACHE_BUDGET = 5 * 1024 * 1024;

/** Whether the worker caches `file` (a path under dist) at install: the offline set. */
export function precached(file) {
  if (!keepable(file) || ON_DEMAND.test(file)) return false;
  if (file === 'index.html' || /^[a-z]{2}\/index\.html$/.test(file)) return true;
  if (file.endsWith('manifest.webmanifest')) return true;
  return START_MAPS.has(file) || ROOT_FILES.has(file) || WHOLE_FOLDERS.some((f) => file.startsWith(f));
}

/** The URL path under the scope a file is asked by: a page by its folder, `es/` for es/index.html. */
export const requestPath = (file) => file.replace(/(^|\/)index\.html$/, '$1');

/** The first 16 hex digits of the sha256 of `body`: a file's hash, which the worker stamps on its kept copy. */
const fileHash = (body) => createHash('sha256').update(body).digest('hex').slice(0, 16);

/**
 * What the worker caches at install, as paths under the scope, their total size in bytes, the build's digest (the
 * sha256 of the path and bytes of every file it may keep, at install or later, in order), the hash of each of those
 * files by its path under the scope (VENT-90: a new build copies the unchanged ones from the older build's cache), and
 * the device extras with the bytes of each set (VENT-95).
 * @param {string} dist
 * @returns {{ precache: string[], bytes: number, digest: string, hashes: Record<string, string>,
 *   extras: Record<string, string[]>, extraBytes: Record<string, number> }}
 */
export function precacheOf(dist) {
  const files = filesUnder(dist).filter(keepable).sort();
  const hash = createHash('sha256');
  /** @type {Record<string, string>} */
  const hashes = {};
  let bytes = 0;
  const extraBytes = Object.fromEntries(Object.keys(DEVICE_EXTRAS).map((set) => [set, 0]));
  for (const file of files) {
    const body = readFileSync(join(dist, file));
    hash.update(`${file}\0`).update(body);
    hashes[requestPath(file)] = fileHash(body);
    if (precached(file)) bytes += body.length;
    for (const [set, extras] of Object.entries(DEVICE_EXTRAS)) {
      if (extras.includes(file)) extraBytes[set] += body.length;
    }
  }
  const precache = files.filter(precached).map(requestPath);
  return { precache, bytes, digest: hash.digest('hex'), hashes, extras: DEVICE_EXTRAS, extraBytes };
}

/** `bytes` in megabytes (MiB), two decimals. */
export const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/**
 * Throws when a first visit's worker would download more than `budget` bytes: the install set, plus the largest set
 * of device extras (`extraBytes`, by set), so the build fails instead of shipping it.
 * @param {number} bytes
 * @param {Record<string, number>} [extraBytes]
 * @param {number} [budget]
 */
export function assertPrecacheBudget(bytes, extraBytes = {}, budget = PRECACHE_BUDGET) {
  for (const [set, extra] of Object.entries({ common: 0, ...extraBytes })) {
    const total = bytes + extra;
    if (total <= budget) continue;
    const what = set === 'common' ? 'the precache' : `the precache with the ${set} extras`;
    throw new Error(`sw.js: ${what} is ${megabytes(total)} (${total} bytes), over its ${megabytes(budget)} budget`);
  }
}

/** The build log's line: the install set, each set of extras and the largest first visit, against the budget. */
function budgetLine(precache, bytes, extraBytes) {
  const extras = Object.entries(extraBytes).map(([set, extra]) => `, ${set} extras ${megabytes(extra)}`);
  const largest = bytes + Math.max(0, ...Object.values(extraBytes));
  return (
    `sw.js: ${precache.length} files, precache ${megabytes(bytes)}${extras.join('')}, ` +
    `largest first visit ${megabytes(largest)} of ${megabytes(PRECACHE_BUDGET)}`
  );
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
        const { precache, bytes, digest, hashes, extras, extraBytes } = precacheOf(dist);
        assertPrecacheBudget(bytes, extraBytes);
        await bundle(dist, { precache, digest, hashes, extras });
        logger.info(`${budgetLine(precache, bytes, extraBytes)}, cache ${digest.slice(0, 12)}`);
      },
    },
  };
}
