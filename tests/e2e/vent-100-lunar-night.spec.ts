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
 * The lunar night in the 3D view (VENT-100, the human's «intermediate» night): on the recorded IM-2 relief, at night the
 * view says when the Sun rises (the «Sunrise in» widget's count) and its caption says the light is added; the Earth's
 * light reaches the ground when the Earth is over the terrain (before VENT-100 the Sun's mask put it out at night); by
 * day neither shows; and on a phone the notice is never cut.
 */
import { expect, test, type Browser, type BrowserContextOptions, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';

/** Sun −3.7°, Earth −0.3° at IM-2, under the level but 0.9° over the terrain, which dips there: night. */
const NIGHT = new Date('2026-11-06T15:04:00Z');
/** Earth +1.8° at IM-2, the Sun down: night under a low Earth, its light grazing the ground. */
const EARTH_UP = new Date('2026-12-02T00:00:00Z');
/**
 * Two nights at IM-2 that open on the same heading, toward the Earth (336° and 334°), with the Sun as low (−2.5° and
 * −2.8°): the Earth 4.2° over the terrain, and 0.9° behind it.
 */
const EARTH_OVER = new Date('2026-11-04T00:00:00Z');
const EARTH_HIDDEN = new Date('2026-11-10T00:00:00Z');
/** Sun +6.7° at IM-2: day. */
const DAY = new Date('2026-11-22T00:00:00Z');
const START_MS = 30_000;
const SHOTS = process.env.VENT100_SHOTS;
const NIGHT_NOTE = 'Earth: NASA Blue Marble · light added for legibility';
const DAY_NOTE = 'Earth: NASA Blue Marble · shadows lifted and exposure raised 20 % for legibility';
/**
 * How much brighter the ground under the skyline must read with the Earth over the terrain than behind it. Before
 * VENT-100 the Sun's mask put the Earth's light out at night, so both read alike.
 */
const EARTH_LIT_RATIO = 2;

/** The view's host by its class: the pseudo-locale renames its role. */
const host = (page: Page) => page.locator('.on-foot__host');
const notice = (page: Page) => page.locator('.on-foot__night');
const note = (page: Page) => page.locator('.on-foot__caption-note');

async function open(page: Page, at: Date, path = './'): Promise<void> {
  await page.clock.setFixedTime(at);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubRealRelief(page);
  await page.goto(`${path}?site=im2-athena&quality=low#horizon`);
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await expect(note(page)).toBeVisible({ timeout: START_MS });
}

/**
 * The mean linear luminance (0 to 1) of the ground just under the skyline, in the free band on a phone: the notice and
 * the caption hidden for the reading, never the sheet or the bars.
 */
async function groundLuminance(page: Page): Promise<number> {
  await page.addStyleTag({ content: '.on-foot__top { visibility: hidden !important; }' });
  const box = (await host(page).boundingBox())!;
  const floor = await page.evaluate(() => Math.min(
    document.querySelector('.sheet')?.getBoundingClientRect().top ?? Infinity,
    document.querySelector('.tab-bar')?.getBoundingClientRect().top ?? Infinity));
  const bottom = Math.min(box.y + box.height, floor) - 4;
  const height = Math.min(box.height * 0.2, 60);
  const clip = { x: box.x + box.width * 0.1, y: bottom - height, width: box.width * 0.8, height };
  const raw = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer();
  const linear = (v: number): number => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  let sum = 0;
  for (let i = 0; i < raw.length; i += 3) sum += 0.2126 * linear(raw[i]!) + 0.7152 * linear(raw[i + 1]!) + 0.0722 * linear(raw[i + 2]!);
  return sum / (raw.length / 3);
}

/** The ground's luminance at `at`, in a context of its own: a page's clock is set once. */
async function groundAt(browser: Browser, options: BrowserContextOptions, at: Date): Promise<number> {
  const context = await browser.newContext(options);
  try {
    const page = await context.newPage();
    await open(page, at);
    await shot(page, `${options.isMobile ? 'phone' : 'desktop'}-ground-${at.toISOString().slice(0, 10)}`);
    return await groundLuminance(page);
  } finally {
    await context.close();
  }
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Whether `box` sits inside the phone's free band: under the top bar, over the sheet and the tab bar. */
async function inFreeBand(page: Page, target: Locator): Promise<boolean> {
  const box = await target.boundingBox();
  const chrome = await page.evaluate(() => {
    const bottom = (s: string): number => document.querySelector(s)?.getBoundingClientRect().bottom ?? 0;
    const top = (s: string): number => document.querySelector(s)?.getBoundingClientRect().top ?? Infinity;
    return { barBottom: bottom('.phone-bar'), floor: Math.min(top('.sheet'), top('.tab-bar')) };
  });
  return box !== null && box.y >= chrome.barBottom - 0.5 && box.y + box.height <= chrome.floor + 0.5;
}

/** Whether every line of `target` is drawn whole: nothing clipped by its box or its parent's. */
async function whole(target: Locator): Promise<boolean> {
  return target.evaluate((el) => {
    const parent = el.parentElement!.getBoundingClientRect();
    const own = el.getBoundingClientRect();
    return own.top >= parent.top - 0.5 && own.bottom <= parent.bottom + 0.5
      && el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
  });
}

for (const [device, use] of [
  ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ['desktop', { viewport: { width: 1280, height: 800 } }],
] as const) {
  test.describe(`lunar night on a ${device}`, () => {
    test.use(use);

    test('at night the view says when the Sun rises and that the light is added', async ({ page }) => {
      await open(page, NIGHT);
      await expect(notice(page)).toContainText('Lunar night here');
      await expect(notice(page)).toContainText('The Sun rises in 8 d 16 h');
      await expect(note(page)).toHaveText(NIGHT_NOTE);
      if (device === 'phone') expect(await inFreeBand(page, notice(page))).toBe(true);
      await shot(page, `${device}-night-2026-11-06`);
    });

    test('with the Earth over the terrain its light reaches the ground', async ({ browser, baseURL }) => {
      const options: BrowserContextOptions = { ...use, serviceWorkers: 'block', ...(baseURL ? { baseURL } : {}) };
      const earthDown = await groundAt(browser, options, EARTH_HIDDEN);
      const earthUp = await groundAt(browser, options, EARTH_OVER);
      console.log(`${device}: ground luminance Earth down ${earthDown.toFixed(4)}, Earth up ${earthUp.toFixed(4)}`);
      expect(earthUp).toBeGreaterThan(earthDown * EARTH_LIT_RATIO);
    });

    test('under a low Earth the night is said the same', async ({ page }) => {
      await open(page, EARTH_UP);
      await expect(notice(page)).toContainText('Lunar night here');
      await expect(notice(page)).toContainText('The Sun rises in 13 d 5 h');
      await expect(note(page)).toHaveText(NIGHT_NOTE);
      await shot(page, `${device}-earth-up-2026-12-02`);
    });

    test('by day no notice shows and the caption is the day\'s', async ({ page }) => {
      await open(page, DAY);
      await expect(note(page)).toHaveText(DAY_NOTE);
      await expect(notice(page)).toHaveCount(0);
      await shot(page, `${device}-day-2026-11-22`);
    });
  });
}

for (const [scale, path] of [[2, './'], [1, './en-xa/']] as const) {
  test.describe(`the night notice on a phone, text x${scale}${path === './' ? '' : ', pseudo-locale'}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('is never cut: whole in the free band at peek, hidden where the band has no room', async ({ page }) => {
      await page.addInitScript((s) => {
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.fontSize = `${s * 100}%`;
        });
      }, scale);
      await open(page, NIGHT, path);
      // The sheet at half (as the page opens): the notice is whole, or hidden, never cut.
      await expect.poll(async () => (await notice(page).getAttribute('data-cut')) !== null || await whole(notice(page))).toBe(true);
      // The Horizon tab puts the sheet at peek: the band has room and the notice shows whole in it.
      await page.locator('.tab-bar .tab').nth(3).click();
      await expect.poll(() => notice(page).getAttribute('data-cut')).toBeNull();
      await expect.poll(() => inFreeBand(page, notice(page))).toBe(true);
      expect(await whole(notice(page))).toBe(true);
      await expect(notice(page)).toBeVisible();
      await shot(page, `phone-night-x${scale}${path === './' ? '' : '-en-xa'}`);
    });
  });
}
