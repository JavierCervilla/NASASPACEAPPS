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
 * An old page after a deploy (VENT-52): the server holds only the new build's files, so a view loaded on demand that
 * the page never fetched answers 404 and its import fails («Failed to fetch dynamically imported module»). The app
 * must not empty: the view's place holds a calm state and the «New version ready» row offers «Update», which reloads
 * the same address. Simulated with a 404 on the view's chunk; no service worker is needed for it (the same 404
 * happens without one).
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-22T20:00:00Z');
const PATH = './?lat=-85.50&lon=40.00#globe';

/** Opens the pin's point with `chunk` (a file name start under `_astro/`) answering 404. */
async function openWithout(page: Page, chunk: string): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubWall(page, 300, 330);
  await stubTile(page);
  await page.route(new RegExp(`/_astro/${chunk}[.-][^/]+\\.js$`), (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto(PATH);
  await expect(page.getByRole('button', { name: 'New version ready: update now' })).toHaveCount(0);
}

const buttons = (page: Page): Promise<number> => page.locator('button').count();

/** Opens the Horizon view and checks the app stayed, the row offers «Update» and the view's place is calm. */
async function openHorizon(page: Page): Promise<void> {
  await expect.poll(() => buttons(page)).toBeGreaterThan(20);
  await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
  await expect(page.locator('.update-notice__live')).toHaveText('New version ready');
  await expect(page.getByRole('button', { name: 'New version ready: update now' })).toBeVisible();
  await expect(page.getByText('Update the app to open this view')).toBeVisible();
  expect(await buttons(page)).toBeGreaterThan(20);
  // The island's own controls stay: the site button heads the header.
  await expect(page.getByRole('button', { name: /^Change site, now/ })).toBeVisible();
}

test.describe('a view whose chunk is gone after a deploy, 1440x900', () => {
  test('the panel’s chunk: the app stays, «Update» reloads the same address', async ({ page }) => {
    await openWithout(page, 'TerrainPanel');
    await openHorizon(page);
    await page.screenshot({ path: test.info().outputPath('missing-panel.png') });
    const at = page.url();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'New version ready: update now' }).click()]);
    expect(page.url()).toBe(at);
  });

  test('the scene’s chunk: the app stays and the view asks for the update', async ({ page }) => {
    await openWithout(page, 'terrain-scene');
    await openHorizon(page);
    await page.screenshot({ path: test.info().outputPath('missing-scene.png') });
  });
});
