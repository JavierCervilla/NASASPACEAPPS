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
 * Rasterizes the team's wordmark (assets/universelle-logo.svg) to a
 * transparent PNG in the app's near-white, for the end card: the SVG fills
 * with a CSS variable and a render reads pictures from its media folder.
 *
 *   node video/demo/capture/logo.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SVG = fileURLToPath(new URL('../assets/universelle-logo.svg', import.meta.url));
const OUT = fileURLToPath(new URL('../media/universelle-logo.png', import.meta.url));
const WIDTH = 1600;
const INK = '#f2f2f4';

const svg = readFileSync(SVG, 'utf8');
const height = Math.ceil((WIDTH * 113.21) / 521.98);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height }, deviceScaleFactor: 1 });
await page.setContent(`<style>:root{--color-dark:${INK}}html,body{margin:0;background:transparent}svg{display:block;width:${WIDTH}px;height:${height}px}</style>${svg}`);
await page.locator('svg').screenshot({ path: OUT, omitBackground: true });
await browser.close();
process.stdout.write(`media/universelle-logo.png ${WIDTH} x ${height}\n`);
