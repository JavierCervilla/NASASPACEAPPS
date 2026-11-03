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

// Proves the dev tools stay out of what a visitor downloads without asking: a production build carries them only as a
// chunk `?debug` loads after the page has started (VENT-49), so no page, no file a page loads at start and nothing the
// service worker precaches may carry their markers, and Spector.js is in no file. A build made with PUBLIC_PERF_HUD=1
// must carry them instead, which shows the check can fail. The decision is devtools-guard.mjs's; runs after every
// `astro build` (package.json).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { devtoolsVerdict } from './devtools-guard.mjs';
import { precacheOf } from './service-worker.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname;
const expectTools = process.env.PUBLIC_PERF_HUD === '1';

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const files = new Map(
  filesUnder(DIST).map((file) => [relative(DIST, file).split(sep).join('/'), readFileSync(file, 'latin1')]),
);
const problems = devtoolsVerdict({ files, precache: precacheOf(DIST).precache, expectTools });
if (problems.length > 0) {
  for (const problem of problems) console.error(`check-no-devtools: ${problem}`);
  process.exit(1);
}
const what = expectTools ? 'dev tools present, as asked' : 'no dev tools at start or in the precache, no Spector.js';
console.warn(`check-no-devtools: ok (${what})`);
