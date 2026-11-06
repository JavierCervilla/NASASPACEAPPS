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
 * The on-foot view's photographed maps stay light (VENT-94): a phone loads the 512 px Earth and never the 1024 px one, a
 * desktop the reverse, and the maps the view downloads on opening keep under a budget that the old 469 kB regolith
 * normal map alone broke.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;
/** The phone Earth is 512 px wide (on-foot-earth-512), the desktop's 1024 px (on-foot-earth). */
// The albedo and the Earths come as KTX2 where the GPU takes it (VENT-101; SwiftShader: BC1), the normal map as WebP.
const PHONE_EARTH = /\/on-foot-earth-512[.-][^/]*\.(webp|ktx2)$/;
const DESKTOP_EARTH = /\/on-foot-earth\.[^/]*\.(webp|ktx2)$/;
const MAPS = /\/on-foot-(regolith|earth)[^/]*\.(webp|ktx2)$/;
/** What the three maps may weigh together, bytes: 234 kB on a phone and 293 kB on a desktop since VENT-94 (it was 570 kB). */
const MAPS_BUDGET = 300_000;

/** Opens the view on the cheapest tier and returns the map URLs it asked for and their bytes. */
async function openView(page: Page, open: () => Promise<void>): Promise<{ urls: string[]; bytes: number }> {
  const maps: Promise<{ url: string; bytes: number }>[] = [];
  page.on('response', (response) => {
    if (MAPS.test(response.url())) maps.push(response.body().then((body) => ({ url: response.url(), bytes: body.length })));
  });
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubTile(page, {});
  await stubWall(page, 100, 140);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far,rocks,shade,shadows');
  await open();
  const host = page.getByRole('application', { name: 'On foot at the site' });
  await expect(host).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(() => maps.length, { timeout: START_MS }).toBe(3);
  const got = await Promise.all(maps);
  return { urls: got.map(({ url }) => url), bytes: got.reduce((sum, { bytes }) => sum + bytes, 0) };
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('loads the 512 px Earth, not the desktop one, and the maps keep under budget', async ({ page }) => {
    const { urls, bytes } = await openView(page, () =>
      page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click());
    expect(urls.filter((url) => PHONE_EARTH.test(url))).toHaveLength(1);
    expect(urls.filter((url) => DESKTOP_EARTH.test(url))).toEqual([]);
    expect(bytes).toBeLessThan(MAPS_BUDGET);
  });
});

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('loads the 1024 px Earth, not the phone one, and the maps keep under budget', async ({ page }) => {
    const { urls, bytes } = await openView(page, () =>
      page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click());
    expect(urls.filter((url) => DESKTOP_EARTH.test(url))).toHaveLength(1);
    expect(urls.filter((url) => PHONE_EARTH.test(url))).toEqual([]);
    expect(bytes).toBeLessThan(MAPS_BUDGET);
  });
});
