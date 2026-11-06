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
 * VENT-98: the 3D view over binary terrain tiles. The view asks the ring with `format=bin`; an API with binary tiles
 * lists binary urls and answers them as `application/octet-stream` (here the recorded IM-2 tiles in the binary format,
 * terrain-stub.ts), and the view stands on them as it does on the JSON ones, with the same reading of the Sun. Against
 * an API without binary tiles (the same stub without `binary`) every tile stays JSON and the view stands too.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';
import { idleCount } from './view-idle';

/** IM-2 with the Sun just over its ridge, as terrain-view.spec.ts reads it. */
const RIDGE_AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;
const PATH = './?site=im2-athena&quality=high&onfoot=far#horizon';

const host = (page: Page) =>
  page.getByRole('region', { name: 'On foot at the site' }).getByRole('application', { name: 'On foot at the site' });

async function openOver(page: Page, binary: boolean): Promise<{ tiles: string[]; types: string[] }> {
  const tiles: string[] = [];
  const types: string[] = [];
  await page.clock.setFixedTime(RIDGE_AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  page.on('request', (r) => {
    if (/\/api\/v1\/terrain\/tiles/.test(r.url())) tiles.push(r.url());
  });
  await stubApi(page);
  await stubRealRelief(page, { binary, tileTypes: types });
  await page.goto(PATH);
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(0);
  await idleCount(host(page));
  return { tiles, types };
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('stands on binary tiles from an API that has them, the Sun read as on the JSON ones', async ({ page }) => {
    const { tiles, types } = await openOver(page, true);
    const [ring, ...rest] = tiles;
    expect(ring).toMatch(/\/terrain\/tiles\?.*format=bin/);
    expect(rest.length).toBeGreaterThan(10);
    for (const url of rest) expect(url).toMatch(/&format=bin$/);
    expect(new Set(types)).toEqual(new Set(['application/octet-stream']));
    await expect(host(page)).toHaveAccessibleDescription(/The Sun is to the [a-z-]+, above the terrain\./);
    await expect(host(page)).not.toHaveAccessibleDescription(/hides the Sun/);
    expect(Number(await host(page).getAttribute('data-frames'))).toBeGreaterThan(0);
  });

  test('stands on JSON tiles from an API without binary ones, whose list ignores the parameter', async ({ page }) => {
    const { tiles, types } = await openOver(page, false);
    expect(tiles.slice(1).every((url) => !url.includes('format=bin'))).toBe(true);
    expect(new Set(types)).toEqual(new Set(['application/json']));
    await expect(host(page)).toHaveAccessibleDescription(/The Sun is to the [a-z-]+, above the terrain\./);
  });
});
