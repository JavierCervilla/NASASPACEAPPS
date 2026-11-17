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

// Runs every Playwright project in turn, each with its own worker count, and
// fails at the end if any of them failed (VENT-129). A chain of `&&` stopped
// at the first red project, so a failure in `app` hid whether `onfoot` and
// `bench` passed.
import { spawnSync } from 'node:child_process';

/**
 * The projects in order, with the workers each needs (playwright.config.ts
 * says why): none means the config's own count.
 */
const PROJECTS = [
  { name: 'app' },
  { name: 'landing' },
  { name: 'quiet', workers: 2 },
  { name: 'onfoot', workers: 2 },
  { name: 'bench' },
];

const failed = [];
for (const { name, workers } of PROJECTS) {
  const args = ['playwright', 'test', `--project=${name}`];
  if (workers) args.push(`--workers=${workers}`);
  const run = spawnSync('npx', args, { stdio: 'inherit' });
  if (run.status !== 0) failed.push(name);
}
const verdict = failed.length ? `failed: ${failed.join(', ')}` : 'all passed';
console.log(`\ne2e projects ${verdict}`);
process.exit(failed.length ? 1 : 0);
