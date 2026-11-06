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
 * VENT-105: the `?debug` readout states the conditions of what it shows, so a screenshot of it explains itself: the
 * address's diagnostic switches, what the on-foot view draws with (from the scene, not the address), the shared
 * instant with the Sun at the selected point, and which canvas lost its WebGL context and when.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;
/** Sun +6.7° at IM-2 (tests/e2e/vent-100-lunar-night.spec.ts): day. */
const DAY = new Date('2026-11-22T00:00:00Z');
const CRUMBS_KEY = 'ventana.devtools.breadcrumbs';

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });
const readout = (page: Page) => page.locator('[data-devtools]');
/** The readout's text (hud-elements.ts TEXT_ID), one line per row. */
const text = (page: Page) => page.locator('#ventana-perf-hud-text');

async function openOnFoot(page: Page): Promise<void> {
  await page.clock.setFixedTime(DAY);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far&debug&depth=linear&shadows=force#horizon');
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect(readout(page)).toBeVisible({ timeout: START_MS });
  await readout(page).getByRole('button', { name: 'Performance readout' }).click();
}

test.describe('?debug conditions, desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the readout names the switches, what the on-foot view draws with and the instant', async ({ page }) => {
    await openOnFoot(page);
    await expect(text(page)).toContainText(
      'switches: depth=linear shadows=force onfoot=far quality=low', { timeout: START_MS });
    await expect(text(page)).toHaveText(
      /\non-foot: depth linear · \d+ bits · reversed off · shadow map on \(forced\) · tier low\n/, { timeout: START_MS });
    await expect(text(page)).toHaveText(/\ninstant live · 2026-11-22 00:00 UTC · Sun \+6\.\d° · day \(terrain\)\n/);
    // Above the trail, so it shows unfolded without scrolling.
    const lines = (await text(page).textContent())?.split('\n') ?? [];
    expect(lines.findIndex((line) => line.startsWith('switches:')))
      .toBeLessThan(lines.indexOf('This session:'));
  });

  test('the readout follows the address when the app changes it in place', async ({ page }) => {
    await openOnFoot(page);
    await page.evaluate(() => history.replaceState(null, '', `${location.pathname}?site=im2-athena&debug#horizon`));
    await expect(text(page)).toContainText('switches: none', { timeout: START_MS });
  });

  test('a lost on-foot context is named with its second, in the readout and the breadcrumbs', async ({ page }) => {
    await openOnFoot(page);
    await expect(text(page)).toContainText('on-foot: depth linear', { timeout: START_MS });
    await host(page).locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    // The readout folds itself away from the view's «Try again» (VENT-107), counting the loss on its one line.
    const button = readout(page).getByRole('button', { name: 'Performance readout' });
    await expect(button).toHaveAttribute('aria-expanded', 'false', { timeout: START_MS });
    await expect(readout(page)).toContainText('· 1 error');
    await button.click();
    await expect(text(page)).toHaveText(/\nWebGL context lost: on-foot at \d+\.\d s\n/, { timeout: START_MS });
    const trail = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as string[], CRUMBS_KEY);
    expect(trail.some((line) => / context lost: on-foot$/.test(line))).toBe(true);
  });
});

test.describe('?debug after a lost on-foot context, phone 412x915 (VENT-107)', () => {
  test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

  test('the open readout folds itself, so «Try again» is in reach', async ({ page }) => {
    await openOnFoot(page);
    await expect(readout(page).getByRole('button', { name: 'Performance readout' })).toHaveAttribute('aria-expanded', 'true');
    await host(page).locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    const again = page.getByRole('button', { name: 'Try again' });
    await expect(again).toBeVisible({ timeout: START_MS });
    await expect(readout(page)).toContainText('· 1 error');
    const [r, a] = [await readout(page).boundingBox(), await again.boundingBox()];
    const apart = !r || !a || r.x + r.width <= a.x || a.x + a.width <= r.x || r.y + r.height <= a.y || a.y + a.height <= r.y;
    await page.screenshot({ path: test.info().outputPath('phone-lost.png') });
    expect(apart).toBe(true);
  });
});
