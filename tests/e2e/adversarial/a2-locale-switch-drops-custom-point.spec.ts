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
 * Adversarial repro, VENT-10, class A2 (state lost on navigation). Promise: the dropped point lives in the address
 * (`?lat&lon`) so it survives a reload and can be shared. Changing the interface language goes to the locale's page
 * with the hash only (i18n/switch.ts, localeHref), so the astronaut goes home and the custom point is gone: the person
 * changed the language, not the place.
 */
import { expect, test } from '@playwright/test';
import { stubApi } from '../api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('A2 · switching the language keeps the astronaut on its custom point', async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await page.goto('./?lat=-85.87&lon=61.34');
    await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible();
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');

    await page.getByRole('button', { name: /language/i }).click();
    // The Spanish item, by the English name it carries beside «Español».
    await page.getByRole('menuitemradio', { name: /Spanish$/ }).click();
    await page.waitForURL(/\/es\//);
    await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible();

    const params = new URL(page.url()).searchParams;
    expect({ lat: params.get('lat'), lon: params.get('lon') }).toEqual({ lat: '-85.87', lon: '61.34' });
    await expect(page.locator('.astro-dock')).toHaveAttribute('data-status', 'away');
  });
});
