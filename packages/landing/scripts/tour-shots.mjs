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

// The landing's tour pictures (VENT-109): the app's own views at IM-2 Athena on 22 Nov 2026, 20:00 UTC, an open
// landing window with Robledo listening, taken from a running app with the browser's clock set to that instant.
//   node packages/landing/scripts/tour-shots.mjs [--app https://nasa.universelle.io/app/]
// Needs Playwright's Chromium (in a cloud container: PW_CHROMIUM_PATH) with SwiftShader for WebGL, and sharp.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const INSTANT = new Date('2026-11-22T20:00:00Z');
const OUT = new URL('../public/media/', import.meta.url);
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const SHOTS = [
  { name: 'globe', query: '?site=im2-athena#globe', size: DESKTOP, waitMs: 8000 },
  { name: 'onfoot', query: '?site=im2-athena#horizon', size: DESKTOP, waitMs: 30000, crop: 'onfoot' },
  { name: 'dsn', query: '?site=im2-athena#dsn', size: DESKTOP, waitMs: 8000 },
  { name: 'phone', query: '?site=im2-athena', size: PHONE, waitMs: 8000 },
];
// A 16:10 piece of the 3D panel around the Sun and the Earth, in CSS pixels of the desktop layout: the header, the
// card and the calendar left out, the same shape as the tour's other pictures.
const ONFOOT_PANEL = { x: 210, y: 88, width: 684, height: 427 };

const { values } = parseArgs({ options: { app: { type: 'string', default: 'https://nasa.universelle.io/app/' } } });
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
});
await mkdir(OUT, { recursive: true });
for (const shot of SHOTS) {
  const page = await browser.newPage({ viewport: shot.size, deviceScaleFactor: 2, colorScheme: 'dark' });
  await page.clock.install({ time: INSTANT });
  await page.clock.resume();
  await page.goto(new URL(shot.query, values.app).href, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(shot.waitMs);
  const png = await page.screenshot(shot.crop ? { clip: ONFOOT_PANEL } : {});
  const target = new URL(`tour-${shot.name}.webp`, OUT);
  await sharp(png).resize({ width: shot.size.width }).webp({ quality: 80 }).toFile(target.pathname);
  console.log(`tour-${shot.name}.webp`);
  await page.close();
}
await browser.close();
