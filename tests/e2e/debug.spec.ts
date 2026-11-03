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
 * `?debug` in production (VENT-49, the human's decision): the address loads the studio's performance readout, the
 * breadcrumbs and the context watch after the page has started; without it nothing of the dev tools is asked for. With
 * the tools on, the on-foot view's report steps are marked in the breadcrumbs, and the language switch keeps `?debug`.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-22T20:00:00Z');
const POINT = 'lat=-85.50&lon=40.00';
/** The dev tools' files (scripts/service-worker.mjs ON_DEMAND): their chunk and their styles. */
const TOOL_FILES = /\/_astro\/(boot|perf-hud|spector)[.-]/;
/** The breadcrumbs' storage key (src/devtools/breadcrumbs.ts), a marker only the dev tools' chunk carries. */
const CRUMBS_KEY = 'ventana.devtools.breadcrumbs';
/** After start (src/lib/after-start.ts) is 2 s at most after the page's scripts run. */
const AFTER_START_MS = 2000;
const START_MS = 30_000;

const readout = (page: Page) => page.locator('[data-devtools]');

async function open(page: Page, path: string, requests?: string[]): Promise<void> {
  await load(page, path, requests);
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', /\w/, { timeout: START_MS });
}

async function load(page: Page, path: string, requests?: string[]): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  if (requests) page.on('request', (request) => requests.push(request.url()));
  await stubApi(page);
  await stubWall(page, 300, 330);
  await stubTile(page);
  await page.goto(path);
}

/** The scripts and stylesheets the page fetched that carry the breadcrumbs' key. */
function carryingCrumbs(page: Page): () => Promise<string[]> {
  const reads: Promise<string | null>[] = [];
  page.on('response', (response) => {
    if (!/\.(js|css)(\?|$)/.test(response.url())) return;
    reads.push(response.text().then((text) => (text.includes(CRUMBS_KEY) ? response.url() : null), () => null));
  });
  return async () => (await Promise.all(reads)).filter((url): url is string => url !== null);
}

const trail = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as string[], CRUMBS_KEY);

test.describe('?debug, desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('without ?debug the page asks for nothing of the dev tools', async ({ page }) => {
    const requests: string[] = [];
    const carrying = carryingCrumbs(page);
    await open(page, `./?${POINT}`, requests);
    await page.waitForTimeout(AFTER_START_MS + 1000);
    await expect(readout(page)).toHaveCount(0);
    await expect(page.locator('.ventana-perf-hud')).toHaveCount(0);
    expect(requests.filter((url) => TOOL_FILES.test(url))).toEqual([]);
    expect(await carrying()).toEqual([]);
    expect(await trail(page)).toEqual([]);
  });

  test('with ?debug the readout shows after start, without Spector.js, clear of the header', async ({ page }) => {
    const requests: string[] = [];
    await open(page, `./?${POINT}&debug`, requests);
    await expect(readout(page)).toBeVisible({ timeout: START_MS });
    await expect(page.locator('.ventana-perf-hud')).toHaveCount(1);
    expect(requests.some((url) => /\/_astro\/boot[.-]/.test(url))).toBe(true);
    // The tier buttons are there; Spector.js never ships in a production build, so its button is not offered.
    await expect(readout(page).getByRole('button', { name: 'High', exact: true })).toHaveCount(1);
    await expect(readout(page).getByRole('button', { name: 'Spector' })).toHaveCount(0);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
    await expect(page).toHaveURL(/#horizon$/);
  });

  test('opening #horizon with ?debug marks the on-foot view\'s steps in the breadcrumbs', async ({ page }) => {
    await load(page, `./?${POINT}&debug#horizon`);
    await expect(readout(page)).toBeVisible({ timeout: START_MS });
    const host = page.getByRole('application', { name: 'On foot at the site' });
    await expect(host).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    await expect.poll(async () => (await trail(page)).filter((line) => / on-foot: /.test(line)), { timeout: START_MS })
      .toEqual(expect.arrayContaining([expect.stringMatching(/ on-foot: (mount at tier|scene mounted|stage created)/)]));
    expect((await trail(page)).some((line) => line.endsWith(' renderer attached'))).toBe(true);
  });

  test('/es/?debug shows the readout, and the language switch keeps ?debug and the readout', async ({ page }) => {
    await open(page, `./es/?${POINT}&debug#polar-map`);
    await expect(readout(page)).toBeVisible({ timeout: START_MS });
    await page.getByRole('button', { name: 'Idioma: Español' }).click();
    await page.getByRole('menuitemradio', { name: /^English/ }).click();
    await expect(page).toHaveURL(/\/\?lat=-85\.50&lon=40\.00&debug=#polar-map$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(readout(page)).toBeVisible({ timeout: START_MS });
  });
});
