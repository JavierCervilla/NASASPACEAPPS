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
 * Films the live Ventana Lunar app for the demo videos (VENT-110). Each take
 * has a fixed clock, site and hour, waits on the interface's own state, and
 * is recorded through the DevTools screencast at its device scale:
 *
 *   node video/demo/capture/capture.mjs [desktop|onfoot|mobile|all]
 *
 * Writes video/demo/media/<take>.mp4 and <take>.json (the second each step
 * starts at, on the take's clock), both git-ignored. DEMO_URL picks the
 * app's address; without it the script uses https://nasa.universelle.io/app/
 * when that answers, else the root.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installCursor, installTouchMarks } from './cursor.mjs';
import { encodeFrames, startScreencast } from './screencast.mjs';
import { DESKTOP, filmDesktop, readyDesktop } from './takes/desktop.mjs';
import { MOBILE, filmMobile, readyMobile } from './takes/mobile.mjs';
import { ONFOOT, filmOnFoot, readyOnFoot } from './takes/onfoot.mjs';

const MEDIA = fileURLToPath(new URL('../media/', import.meta.url));
const TAKES = {
  desktop: { ...DESKTOP, ready: readyDesktop, film: filmDesktop },
  onfoot: { ...ONFOOT, ready: readyOnFoot, film: filmOnFoot },
  mobile: { ...MOBILE, ready: readyMobile, film: filmMobile },
};

/** Resolves the app's address: DEMO_URL, else /app/ when it serves the app, else the root. */
async function appUrl() {
  if (process.env.DEMO_URL) return process.env.DEMO_URL;
  const root = 'https://nasa.universelle.io/';
  const app = await fetch(`${root}app/`).catch(() => null);
  return app?.ok ? `${root}app/` : root;
}

/** Opens the take's page at its start time, ready to film. */
async function openTake(take, url) {
  const browser = await chromium.launch({ args: [
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
    // The screencast sends CSS-pixel frames unless the scale is forced at launch.
    `--force-device-scale-factor=${take.scale}`,
  ] });
  const context = await browser.newContext({
    viewport: take.view, deviceScaleFactor: take.scale, isMobile: take.mobile, hasTouch: take.mobile,
    colorScheme: 'dark', locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block',
  });
  await context.addInitScript(take.mobile ? installTouchMarks : installCursor);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(take.start));
  await page.goto(`${url}${take.query}`, { waitUntil: 'load' });
  await take.ready(page);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return { browser, page };
}

/** Films one take and writes its footage and step times. */
async function shoot(name, url) {
  const take = TAKES[name];
  const { browser, page } = await openTake(take, url);
  const size = { width: take.view.width * take.scale, height: take.view.height * take.scale };
  const dir = `${MEDIA}frames-${name}/`;
  const stop = await startScreencast(page, { dir, ...size });
  const marks = {};
  await take.film(page, (step) => { marks[step] = Date.now() / 1000; });
  const { times } = await stop();
  await browser.close();
  const zero = encodeFrames({ dir, times, end: marks.end + 0.5, out: `${MEDIA}${name}.mp4` });
  const steps = Object.fromEntries(Object.entries(marks).map(([k, t]) => [k, Number((t - zero).toFixed(3))]));
  const record = { take: name, url, start: take.start, query: take.query, size, frames: times.length, steps };
  writeFileSync(`${MEDIA}${name}.json`, `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

async function main() {
  const which = process.argv[2] ?? 'all';
  const names = which === 'all' ? Object.keys(TAKES) : [which];
  if (!names.every((n) => n in TAKES)) throw new Error(`unknown take ${which}: ${Object.keys(TAKES).join(', ')} or all`);
  mkdirSync(MEDIA, { recursive: true });
  const url = await appUrl();
  for (const name of names) await shoot(name, url);
}

await main();
