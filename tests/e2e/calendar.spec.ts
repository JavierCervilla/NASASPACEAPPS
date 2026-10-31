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

/** The whole strip, slider included, shows on a screen `height` px tall without scrolling. */
async function expectStripFits(page: Page, height: number): Promise<void> {
  await expect(slider(page)).toBeVisible();
  const bottom = await strip(page).evaluate((el) => el.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(height);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
}

/** Picks a site from the header's picker, by its search text and the start of its row's name. */
async function pickSite(page: Page, query: string, row: RegExp): Promise<void> {
  await page.getByRole('button', { name: /^Change site, now/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a site' });
  await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill(query);
  await dialog.getByRole('button', { name: row }).click();
  await expect(dialog).toBeHidden();
}

const SIGNALS = ['window', 'sun', 'earth', 'none'];

test.describe('desktop calendar strip, 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('the whole strip fits a 720 px tall laptop screen: the globe gives up height (QA F3)', async ({ page }) => {
    await open(page);
    await expectStripFits(page, 720);
    await expect(page.getByRole('region', { name: 'Lunar globe' }).locator('canvas')).toHaveCount(1);
  });
});

test.describe('desktop calendar strip, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the header view tabs are 44 px tall targets', async ({ page }) => {
    await open(page);
    const tabs = page.getByRole('navigation', { name: 'View' }).locator('> *');
    await expect(tabs).toHaveCount(3);
    for (const box of await tabs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });

  test('the whole strip fits at 900 px tall too', async ({ page }) => {
    await open(page);
    await expectStripFits(page, 900);
  });

  test('the slider thumb sits on the instant line: a click on the track puts the line under the pointer (QA F7)', async ({
    page,
  }) => {
    await open(page);
    const bar = await strip(page).locator('.signal-bar[data-tone="window"]').boundingBox();
    const track = await slider(page).boundingBox();
    if (!bar || !track) throw new Error('no bars or slider');
    for (const share of [0.02, 0.5, 0.98]) {
      const x = bar.x + bar.width * share;
      await page.mouse.click(x, track.y + track.height / 2);
      const line = await strip(page).locator('.instant-line').boundingBox();
      expect(Math.abs((line?.x ?? 0) + (line?.width ?? 0) / 2 - x)).toBeLessThanOrEqual(3);
    }
  });

  test('at 200 % text «Window» shows whole and the day ticks stay clear of the slider (QA F4)', async ({ page }) => {
    await open(page);
    await expect(strip(page).getByRole('img', { name: /^Window:/ })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const label = strip(page).locator('.strip__label', { hasText: 'Window' });
    const labelBox = await label.boundingBox();
    const bar = await strip(page).locator('.signal-bar[data-tone="window"]').boundingBox();
    expect((labelBox?.x ?? 0) + (labelBox?.width ?? 0)).toBeLessThanOrEqual(bar?.x ?? 0);
    const ticksBottom = await strip(page)
      .locator('.strip__days span')
      .evaluateAll((spans) => Math.max(...spans.map((el) => el.getBoundingClientRect().bottom)));
    const controlsTop = Math.min(
      (await slider(page).boundingBox())?.y ?? 0,
      (await strip(page).getByRole('button', { name: 'Play' }).boundingBox())?.y ?? 0,
    );
    expect(ticksBottom).toBeLessThanOrEqual(controlsTop);
  });

  test('a month without data shows no signal: a neutral dot in the header (QA F5)', async ({ page }) => {
    await open(page);
    const dot = page.locator('.site-button .signal-dot');
    await expect(dot).toHaveAttribute('data-state', 'window');
    // The recorded IM-2 hours start on 1 November: October has none, though its request reaches into November.
    await strip(page).getByRole('button', { name: 'Previous month' }).click();
    await expect(strip(page).getByRole('heading', { name: 'October 2026' })).toBeVisible();
    await expect(strip(page).getByRole('alert')).toBeVisible();
    expect(SIGNALS).not.toContain(await dot.getAttribute('data-state'));
  });

  test('a month with no window at all says so on the window bar (QA F6)', async ({ page }) => {
    await open(page);
    await expect(strip(page).getByText('No landing window this month')).toHaveCount(0);
    await pickSite(page, 'apollo 11', /^Mare Tranquillitatis/);
    await expect(strip(page).getByRole('img', { name: 'Window: 0 % of November 2026' })).toBeVisible();
    await expect(strip(page).getByText('No landing window this month')).toBeVisible();
  });

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
    await expect(page.locator('[data-site-id="im2-athena"]')).toHaveAttribute('aria-pressed', 'true');
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
    await expect(page.locator('[data-site-id="chandrayaan3-vikram"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^Change site, now Chandrayaan-3 Vikram/ })).toBeVisible();
    await expect(strip(page).getByRole('img', { name: /^Window:/ })).toBeVisible();
  });
});
