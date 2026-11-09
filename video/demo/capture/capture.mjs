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
 * Films the live Ventana Lunar app for the demo video (VENT-110): one take at
 * 1920 x 1080 CSS px (device scale 2, so the edit can punch in and stay
 * sharp) through the loop the video tells. The clock is fixed, the site and
 * the hour are fixed, and every step waits on the interface's own state.
 *
 *   node video/demo/capture/capture.mjs
 *
 * Writes video/demo/media/footage.mp4 and video/demo/media/capture.json (the
 * second each step starts at, on the footage's clock), both git-ignored.
 * DEMO_URL picks the app's address; without it the script uses
 * https://nasa.universelle.io/app/ when that answers, else the root.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installCursor } from './cursor.mjs';
import { encodeFrames, startScreencast } from './screencast.mjs';

const MEDIA = fileURLToPath(new URL('../media/', import.meta.url));
const FRAMES = fileURLToPath(new URL('../media/frames/', import.meta.url));
const SCALE = Number(process.env.DEMO_SCALE ?? 2);
const VIEW = { width: 1920, height: 1080 };
/** Hackathon day one, 13:00 UTC: at the ridge the Sun is up and Earth is not. */
const START = '2026-11-14T13:00:00Z';
/** The hour the take moves to: a landing window, Robledo de Chavela listening. */
const WINDOW_HOUR = { index: 19 * 24 + 16, label: 'Fri 20 Nov · 16:00 UTC' };
const SITE_OPTION = 'Shackleton connecting ridge';
const SITE_HEADER = /^Change site, now Blue Moon MK1 Pathfinder/;

const pause = (page, ms) => page.waitForTimeout(ms);
const ease = (u) => 1 - (1 - u) ** 3;

/** Resolves the app's address: DEMO_URL, else /app/ when it serves the app, else the root. */
async function appUrl() {
  if (process.env.DEMO_URL) return process.env.DEMO_URL;
  const root = 'https://nasa.universelle.io/';
  const app = await fetch(`${root}app/`).catch(() => null);
  return app?.ok ? `${root}app/` : root;
}

/** Moves the mouse to (x, y) over `ms`, eased, so the pointer reads as a hand. */
async function glide(page, at, to, ms = 700) {
  const steps = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= steps; i += 1) {
    const u = ease(i / steps);
    await page.mouse.move(at.x + (to.x - at.x) * u, at.y + (to.y - at.y) * u);
    await pause(page, 16);
  }
  at.x = to.x;
  at.y = to.y;
}

/** The centre of a locator's box. */
async function centre(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`no box for ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Glides to a locator and clicks it with the real mouse. */
async function press(page, at, locator, ms) {
  await glide(page, at, await centre(locator), ms);
  await page.mouse.down();
  await pause(page, 90);
  await page.mouse.up();
}

/** Opens the app at START and waits for the globe, the site card and the strip. */
async function open(page, url) {
  await page.clock.setFixedTime(new Date(START));
  const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
  await page.goto(url, { waitUntil: 'load' });
  await texture;
  await page.locator('.globe-ring').waitFor({ state: 'visible' });
  await page.getByRole('img', { name: /^Window:/ }).waitFor();
  const hint = page.getByRole('button', { name: 'Dismiss the hint' });
  if (await hint.isVisible()) await hint.click();
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

/** Turns the globe so the south pole faces the camera, then zooms toward it. */
async function towardThePole(page, at) {
  await glide(page, at, { x: 790, y: 640 }, 900);
  await page.mouse.down();
  await glide(page, at, { x: 790, y: 420 }, 1500);
  await page.mouse.up();
  await glide(page, at, { x: 800, y: 560 }, 500);
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.wheel(0, -250);
    await pause(page, 320);
  }
}

/** Picks the Shackleton connecting ridge in the header's site picker. */
async function pickSite(page, at) {
  await press(page, at, page.getByRole('button', { name: /^Change site/ }), 800);
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await pause(page, 500);
  await press(page, at, dialog.getByText(SITE_OPTION, { exact: true }), 800);
  await page.getByRole('button', { name: SITE_HEADER }).waitFor();
  await page.getByRole('img', { name: /^Sun: 100 %/ }).waitFor();
}

/** Drags the strip's hour slider to the window hour, then lands it exactly with the arrow keys. */
async function scrubToWindow(page, at) {
  const slider = page.getByRole('slider', { name: 'Selected hour' });
  const box = await slider.boundingBox();
  const max = Number(await slider.getAttribute('max'));
  const value = Number(await slider.inputValue());
  const thumb = 10;
  const xOf = (v) => box.x + thumb + (v / max) * (box.width - 2 * thumb);
  const y = box.y + box.height / 2;
  await glide(page, at, { x: xOf(value), y }, 900);
  await page.mouse.down();
  await glide(page, at, { x: xOf(WINDOW_HOUR.index), y }, 2400);
  await page.mouse.up();
  for (let i = 0; i < 24; i += 1) {
    const now = Number(await slider.inputValue());
    if (now === WINDOW_HOUR.index) break;
    await page.keyboard.press(now < WINDOW_HOUR.index ? 'ArrowRight' : 'ArrowLeft');
  }
  await page.locator('.strip__date', { hasText: WINDOW_HOUR.label }).waitFor();
}

/** Opens a view from the header's tabs. */
async function openView(page, at, name) {
  await press(page, at, page.getByRole('navigation', { name: 'View' }).getByRole('link', { name, exact: true }), 900);
}

/** Waits until the on-foot view drew no frame for 600 ms and its ring slices are done. */
async function onFootAtRest(page) {
  const host = page.getByRole('application', { name: 'On foot at the site' });
  await host.waitFor({ state: 'visible' });
  let last = -1;
  for (let tries = 0; tries < 40; tries += 1) {
    const { frames, working } = await host.evaluate((el) => ({
      frames: Number(el.getAttribute('data-frames')),
      working: el.getAttribute('data-working') === 'true',
    }));
    if (frames === last && !working) return;
    last = frames;
    await pause(page, 600);
  }
}

/** A slow drag across the on-foot view, so the camera turns along the ridge. */
async function lookAround(page, at) {
  await glide(page, at, { x: 980, y: 420 }, 700);
  await page.mouse.down();
  await glide(page, at, { x: 760, y: 420 }, 4200);
  await page.mouse.up();
}

/** Plays the loop and returns each step's start, in seconds since the epoch. */
async function film(page) {
  const at = { x: 1500, y: 760 };
  const marks = {};
  const mark = (name) => { marks[name] = Date.now() / 1000; };
  await page.mouse.move(at.x, at.y);
  mark('globe');
  await pause(page, 1200);
  mark('pole');
  await towardThePole(page, at);
  await pause(page, 1500);
  mark('picker');
  await pickSite(page, at);
  mark('site');
  await pause(page, 2000);
  mark('scrub');
  await scrubToWindow(page, at);
  mark('window');
  await pause(page, 2500);
  mark('dsnClick');
  await openView(page, at, 'DSN');
  await page.getByText('Robledo de Chavela', { exact: true }).first().waitFor();
  mark('dsn');
  await pause(page, 4000);
  mark('horizonClick');
  await openView(page, at, 'Horizon');
  await onFootAtRest(page);
  mark('horizon');
  await lookAround(page, at);
  await pause(page, 800);
  mark('end');
  return marks;
}

async function main() {
  const url = await appUrl();
  mkdirSync(MEDIA, { recursive: true });
  const browser = await chromium.launch({ args: [
    '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
    // The screencast sends CSS-pixel frames unless the scale is forced at launch.
    `--force-device-scale-factor=${SCALE}`,
  ] });
  const context = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: SCALE, colorScheme: 'dark', reducedMotion: 'no-preference',
    locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block',
  });
  await context.addInitScript(installCursor);
  const page = await context.newPage();
  await open(page, url);
  const size = { width: VIEW.width * SCALE, height: VIEW.height * SCALE };
  const stop = await startScreencast(page, { dir: FRAMES, ...size });
  const marks = await film(page);
  const { times } = await stop();
  await browser.close();
  const zero = encodeFrames({ dir: FRAMES, times, end: marks.end + 0.5, out: `${MEDIA}footage.mp4` });
  const steps = Object.fromEntries(Object.entries(marks).map(([k, t]) => [k, Number((t - zero).toFixed(3))]));
  const record = { url, start: START, site: SITE_OPTION, hour: WINDOW_HOUR.label, size, frames: times.length, steps };
  writeFileSync(`${MEDIA}capture.json`, `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

await main();
