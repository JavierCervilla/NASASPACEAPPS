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

// The decision behind check-no-devtools.mjs, pure so a test can feed it a made-up dist. Since VENT-49 a production
// build carries the dev tools as a chunk only `?debug` asks for, so the rule is about what a visitor downloads without
// asking: no page's HTML, no file a page loads at start (its scripts and stylesheets and what they import statically)
// and no file the service worker precaches may carry the dev tools' markers, and Spector.js is in no file at all. A
// build made with PUBLIC_PERF_HUD=1 must carry the performance readout instead, which shows the check can fail.
import { posix } from 'node:path';

/** The dev tools' markers: the readout's class and the breadcrumbs' storage key. */
export const MARKERS = ['ventana-perf-hud', 'ventana.devtools.breadcrumbs'];
/** Spector.js, matched in a file's name or text: it may never ship, asked for or not. */
export const SPECTOR = 'spector';

// Any attribute naming a script or a stylesheet: `src`, `href`, and an Astro island's `component-url` and
// `renderer-url`, which hydrate at start.
const PAGE_ASSET = /=["']([^"'\s>]+\.(?:m?js|css))["']/g;
// `import{a}from"./x.js"`, `import"./x.js"`, `export{b}from"./x.js"`, `import*as c from"./x.js"`; never `import(`.
const STATIC_IMPORT = /(?:^|[^\w$.])(?:import|export)\s*(?:[\w$*{}\s,]*?\bfrom\s*)?["']([^"']+)["']/g;

/** The dist file `specifier` names, from `from`; absolute ones may carry the site's base before the file's path. */
function resolve(specifier, from, files) {
  if (!specifier.startsWith('/')) return posix.normalize(posix.join(posix.dirname(from), specifier));
  const path = specifier.slice(1);
  return files.has(path) ? path : [...files.keys()].find((file) => path.endsWith(`/${file}`));
}

/** The files `file` makes the browser load with it: a page's assets, a script's static imports. */
function loadedWith(file, files) {
  const text = files.get(file) ?? '';
  const pattern = file.endsWith('.html') ? PAGE_ASSET : file.endsWith('.js') ? STATIC_IMPORT : null;
  if (!pattern) return [];
  const html = file.endsWith('.html');
  const inline = html ? [...text.matchAll(STATIC_IMPORT)] : [];
  return [...text.matchAll(pattern), ...inline]
    .map((match) => resolve(match[1], file, files))
    .filter((path) => path !== undefined && files.has(path));
}

/**
 * Every file a page loads at start: each page, the scripts and stylesheets it names, and their static imports, over
 * and over. A dynamic `import()` is not followed: that file loads only when the code asks for it.
 * @param {Map<string, string>} files dist path → text
 * @returns {Set<string>}
 */
export function startFiles(files) {
  const seen = new Set([...files.keys()].filter((file) => file.endsWith('.html')));
  const queue = [...seen];
  while (queue.length > 0) {
    for (const next of loadedWith(queue.pop(), files)) {
      if (!seen.has(next)) queue.push(seen.add(next) && next);
    }
  }
  return seen;
}

/** One line per marker in one of `paths`, saying `where`. */
function markersIn(paths, files, where) {
  return [...paths].flatMap((path) =>
    MARKERS.filter((marker) => (files.get(path) ?? '').includes(marker)).map((m) => `"${m}" in ${path}, ${where}`),
  );
}

/**
 * What is wrong with a build; empty when nothing is.
 * @param {{ files: Map<string, string>, precache: string[], expectTools: boolean }} build `precache` holds the
 *   worker's request paths (a page by its folder, `es/` for es/index.html)
 * @returns {string[]}
 */
export function devtoolsVerdict({ files, precache, expectTools }) {
  if (expectTools) {
    const present = [...files.values()].some((text) => text.includes(MARKERS[0]));
    return present ? [] : ['PUBLIC_PERF_HUD=1 but the build has no performance readout'];
  }
  const cached = precache.map((path) => (path === '' || path.endsWith('/') ? `${path}index.html` : path));
  const spector = [...files].filter(([path, text]) => `${path}\n${text}`.includes(SPECTOR));
  return [
    ...markersIn(startFiles(files), files, 'which a page loads at start'),
    ...markersIn(new Set(cached.filter((path) => files.has(path))), files, 'which the service worker precaches'),
    ...spector.map(([path]) => `"${SPECTOR}" in ${path}: Spector.js never ships in a production build`),
  ];
}
