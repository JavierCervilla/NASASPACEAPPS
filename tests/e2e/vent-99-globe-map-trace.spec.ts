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

import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

/** The breadcrumbs' storage key (src/devtools/breadcrumbs.ts). */
const CRUMBS_KEY = 'ventana.devtools.breadcrumbs';
// The canvas is software-rendered in CI: a map takes a while to decode, and the tools come after start.
const MAP_MS = 30_000;

const readout = (page: Page) => page.locator('[data-devtools]');

const globeLines = (page: Page): Promise<string[]> =>
  page.evaluate((key) => (JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    .map((line) => line.replace(/^\d+\.\ds /, ''))
    .filter((line) => line.startsWith('globe: ')), CRUMBS_KEY);

test.describe('the globe map trace, a Pixel-sized phone 412x880 at pixel ratio 1.75', () => {
  test.use({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 1.75, hasTouch: true, isMobile: true });

  test('with ?debug a 4K colour map that fails shows in the breadcrumbs, after the climb to 2K', async ({ page }) => {
    await stubApi(page);
    await page.route(/\/textures\/moon-lroc-4k\.jpg$/, (route) => route.abort('failed'));
    const sharper = page.waitForResponse(/\/textures\/moon-lroc-2k\.jpg$/, { timeout: MAP_MS });
    // The JPEG path's lines (`?ktx2=0`); the KTX2 path's are in globe-ktx2.spec.ts (VENT-101).
    await page.goto('./?quality=medium&debug&ktx2=0');
    await sharper;
    await expect(readout(page)).toBeVisible({ timeout: MAP_MS });
    await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toContain('globe: 2K on the Moon');
    expect(await globeLines(page)).toEqual(expect.arrayContaining([
      'globe: 1K wanted (none shown)', 'globe: 1K on the Moon', 'globe: 2K wanted (1K shown)',
      expect.stringMatching(/^globe: 2K colour uploaded, gl [A-Z_]+$/),
    ]));
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    await page.keyboard.press('+');
    await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toEqual(expect.arrayContaining([
      expect.stringMatching(/^globe: rule wants 4K: disc \d+ px, \d\.\d\d px\/texel; medium, phone, coarse pointer, max \d+$/),
      'globe: 4K wanted (2K shown)',
      'globe: 4K colour loading: moon-lroc-4k.jpg',
      'globe: 4K colour failed: moon-lroc-4k.jpg (error event, no details)',
      'globe: 4K given up, 2K stays',
    ]));
    expect((await globeLines(page)).some((line) => line.startsWith('globe: 4K on the Moon'))).toBe(false);
    await readout(page).getByRole('button', { name: 'Performance readout' }).click();
    await expect(readout(page)).toContainText('globe: 4K colour failed: moon-lroc-4k.jpg', { timeout: MAP_MS });
  });

  test('without ?debug the globe marks nothing', async ({ page }) => {
    await stubApi(page);
    const sharper = page.waitForResponse(/\/textures\/moon-lroc-2k\.(jpg|ktx2)$/, { timeout: MAP_MS });
    await page.goto('./?quality=medium');
    await sharper;
    await page.waitForLoadState('networkidle');
    expect(await globeLines(page)).toEqual([]);
  });
});
