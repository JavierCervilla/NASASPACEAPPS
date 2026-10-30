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
 * The desktop calendar strip under the globe and the header's site picker (VENT-4, validated canvas «Globe view»), at
 * the canvas's date: IM-2 answers real JPL Horizons hours for November 2026 (api-stub.ts).
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The site route of one site, as the page asks for it. */
const HOURS_OF = (id: string) => new RegExp(`/api/v1/sites/${id}\\?`);

async function open(page: Page): Promise<string[]> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  const asked: string[] = [];
  page.on('request', (r) => {
    if (HOURS_OF('[^/?]+').test(r.url())) asked.push(r.url());
  });
  await page.goto('./');
  return asked;
}

const strip = (page: Page) => page.getByRole('region', { name: 'Calendar' });
const slider = (page: Page) => strip(page).getByRole('slider', { name: 'Selected hour' });
const date = (page: Page) => strip(page).locator('.strip__date');

test.describe('desktop calendar strip, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('draws the month as three bars from the hourly data, under a globe that still renders', async ({ page }) => {
    await open(page);
    await expect(strip(page).getByRole('heading', { name: 'November 2026' })).toBeVisible();
    // Real shares of November 2026 for IM-2, as the phone widgets read them.
    await expect(strip(page).getByRole('img', { name: 'Sun: 59 % of November 2026' })).toBeVisible();
    await expect(strip(page).getByRole('img', { name: 'Earth: 58 % of November 2026' })).toBeVisible();
    await expect(strip(page).getByRole('img', { name: 'Window: 48 % of November 2026' })).toBeVisible();
    await expect(strip(page).locator('.signal-bar__on')).not.toHaveCount(0);
    await expect(strip(page).getByRole('list', { name: 'Legend' }).getByRole('listitem')).toHaveText([
      'Sun',
      'Earth',
      'Both: landing window',
      'Neither',
    ]);
    await expect(slider(page)).toHaveValue('546');
    await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Mon 23 Nov · 18:00 UTC');
    await expect(date(page)).toHaveText('Mon 23 Nov · 18:00 UTC');
    // The instant line sits at hour 546 of 720, as on the canvas.
    const left = await strip(page).locator('.instant-line').evaluate((el) => (el as HTMLElement).style.left);
    expect(Number.parseFloat(left)).toBeCloseTo(75.83, 1);
    await expect(page.getByRole('region', { name: 'Lunar globe' }).locator('canvas')).toHaveCount(1);
    await expect(page.locator('.globe-label')).toHaveText('Mons Mouton (IM-2 Athena)');
  });

  test('the slider moves the instant: the date, the line and the globe follow', async ({ page }) => {
    await open(page);
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(date(page)).toHaveText('Mon 23 Nov · 19:00 UTC');
    await page.keyboard.press('PageDown');
    await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Sun 22 Nov · 19:00 UTC');
    await slider(page).fill('0');
    await expect(date(page)).toHaveText('Sun 1 Nov · 00:00 UTC');
    await expect(page.locator('#globe-help')).toContainText('Lit by the Sun as of 1 Nov 2026, 00:00 UTC');
    const now = strip(page).getByRole('button', { name: 'Now' });
    await now.click();
    await expect(date(page)).toHaveText('Mon 23 Nov · 18:00 UTC');
    await expect(now).toBeDisabled();
  });

  test('the arrows change the month by moving the instant', async ({ page }) => {
    const asked = await open(page);
    await strip(page).getByRole('button', { name: 'Next month' }).click();
    await expect(strip(page).getByRole('heading', { name: 'December 2026' })).toBeVisible();
    await expect(date(page)).toHaveText('Wed 23 Dec · 18:00 UTC');
    await strip(page).getByRole('button', { name: 'Previous month' }).click();
    await expect(strip(page).getByRole('heading', { name: 'November 2026' })).toBeVisible();
    // November was kept: going back does not ask again.
    expect(asked.filter((url) => url.includes('from=2026-11-01'))).toHaveLength(1);
  });

  test('Play runs time forward without asking the API again, and Pause stops it', async ({ page }) => {
    const asked = await open(page);
    await expect(strip(page).getByRole('img', { name: /^Sun:/ })).toBeVisible();
    const before = asked.length;
    await strip(page).getByRole('button', { name: 'Play' }).click();
    await expect(date(page)).not.toHaveText('Mon 23 Nov · 18:00 UTC');
    await strip(page).getByRole('button', { name: 'Pause' }).click();
    const stopped = await date(page).textContent();
    await page.waitForTimeout(400);
    await expect(date(page)).toHaveText(stopped ?? '');
    expect(asked.length).toBe(before);
  });

  test('the header site button opens the picker, and a picked site turns the globe to it', async ({ page }) => {
    await open(page);
    const button = page.getByRole('button', { name: 'Change site, now IM-2 Athena, Mons Mouton' });
    await expect(button).toContainText('Mons Mouton · 84.79° S, 29.20° E');
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('vikram');
    await dialog.getByRole('button', { name: /^Statio Shiv Shakti/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.globe-label')).toHaveText('Statio Shiv Shakti (Chandrayaan-3 Vikram)');
    await expect(page.getByRole('button', { name: /^Change site, now Chandrayaan-3 Vikram/ })).toBeVisible();
    await expect(strip(page).getByRole('img', { name: /^Window:/ })).toBeVisible();
  });
});
