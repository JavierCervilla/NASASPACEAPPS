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
 * The on-foot view draws with the browser's own requestAnimationFrame (VENT-74). Every other on-foot spec installs
 * Playwright's clock, whose fake raf accepts any receiver, so a pace that called the real raf as a method of its deps
 * («Illegal invocation») shipped with every test green and the view stuck on its loader in production. This spec
 * installs no clock.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });

async function openReal(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  return errors;
}

test('desktop: the view draws its first frame with the real clock', async ({ page }) => {
  const errors = await openReal(page);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far#horizon');
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS })
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the view draws its first frame with the real clock', async ({ page }) => {
    const errors = await openReal(page);
    await page.goto('./?site=im2-athena&quality=low&onfoot=far#horizon');
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS })
      .toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});
