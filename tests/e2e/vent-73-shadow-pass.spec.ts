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
 * The Sun's shadow map on demand (VENT-73, after a Pixel 10 lost its GPU after seconds of turning): the on-foot
 * view renders the shadow map when what casts or receives the Sun's shadow changes (the first frame, a relight, a
 * new point) and never because the camera turned. The host's `data-shadows` counts the renders the GPU really did.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });
const attr = async (page: Page, name: string): Promise<number> => Number(await host(page).getAttribute(name));

async function open(page: Page): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far');
  await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(() => attr(page, 'data-frames'), { timeout: START_MS }).toBeGreaterThan(0);
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await page.waitForTimeout(1500);
  await expect(host(page)).toHaveAttribute('data-working', 'false');
}

test.describe('shadow map on demand', () => {
  test('turning the view draws frames and renders the shadow map none of the times', async ({ page }) => {
    await open(page);
    const shadows = await attr(page, 'data-shadows');
    expect(shadows, 'the first frames rendered the map').toBeGreaterThan(0);
    await host(page).focus();
    for (let i = 0; i < 20; i++) {
      const frames = await attr(page, 'data-frames');
      await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
      await expect.poll(() => attr(page, 'data-frames'), { timeout: START_MS }).toBeGreaterThan(frames);
    }
    expect(await attr(page, 'data-shadows')).toBe(shadows);
  });

  test('a relight renders it once more, and a new point renders it again', async ({ page }) => {
    await open(page);
    const first = await attr(page, 'data-shadows');
    const slider = page.getByRole('slider', { name: 'Selected hour' });
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => attr(page, 'data-shadows'), { timeout: START_MS }).toBe(first + 1);
    await page.waitForTimeout(1500);
    const lit = await attr(page, 'data-shadows');
    expect(lit, 'one render for the relight, none after').toBe(first + 1);

    await page.locator('.site-button').click();
    await page.locator('#site-popover').getByRole('button', { name: /Malapert/ }).first().click();
    await expect(host(page)).not.toHaveAttribute('data-parked', 'true', { timeout: START_MS });
    await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
    expect(await attr(page, 'data-shadows')).toBeGreaterThan(lit);
  });
});
