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
 * A phone held sideways keeps the 4K cap (VENT-122, verificador round 2). The 8K Moon map at the medium tier is for a
 * desktop, told by the signal the tier detection reads, a fine pointer: a Pixel in landscape is wider than the phone
 * layout, but its pointer is coarse, so zoomed all the way in it asks no 8K map, and the `?debug` rule line says why.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

/** The breadcrumbs' storage key (src/devtools/breadcrumbs.ts). */
const CRUMBS_KEY = 'ventana.devtools.breadcrumbs';
// The canvas is software-rendered in CI: a map takes a while to decode, and the tools come after start.
const MAP_MS = 30_000;
// Presses of «+» that take the camera to its closest zoom, where a wide Retina view would want 8K.
const ZOOM_PRESSES = 12;

const ruleLines = (page: Page): Promise<string[]> =>
  page.evaluate((key) => (JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    .map((line) => line.replace(/^\d+\.\ds /, ''))
    .filter((line) => line.startsWith('globe: rule wants ')), CRUMBS_KEY);

test.describe('a Pixel held sideways, 915x412 at pixel ratio 2.625, touch', () => {
  test.use({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });

  test('zoomed all the way in at the medium tier it stops at 4K and asks no 8K map', async ({ page }) => {
    await stubApi(page);
    const asked: string[] = [];
    page.on('request', (r) => {
      if (/\/textures\/moon-/.test(r.url())) asked.push(r.url().split('/').pop() ?? '');
    });
    const sharper = page.waitForResponse(/\/textures\/moon-lroc-2k\.jpg$/, { timeout: MAP_MS });
    await page.goto('./?quality=medium&debug&ktx2=0');
    await sharper;
    await expect(page.locator('[data-devtools]')).toBeVisible({ timeout: MAP_MS });
    const fourK = page.waitForResponse(/\/textures\/moon-lroc-4k\.jpg$/, { timeout: MAP_MS });
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let i = 0; i < ZOOM_PRESSES; i++) await page.keyboard.press('+');
    await fourK;
    await expect.poll(async () => (await ruleLines(page)).at(-1), { timeout: MAP_MS })
      .toMatch(/^globe: rule wants 4K: disc \d+ px, \d\.\d\d px\/texel; medium, coarse pointer, max \d+$/);
    await page.waitForLoadState('networkidle');
    expect((await ruleLines(page)).filter((line) => line.startsWith('globe: rule wants 8K'))).toEqual([]);
    expect(asked.filter((name) => name.includes('-8k'))).toEqual([]);
  });
});
