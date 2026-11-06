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
 * The globe picks its Moon map by how big the disc is on screen (VENT-97), not by a fixed camera distance: a phone
 * the size of a Pixel opens on the precached 1K map and climbs to 2K at once, and to 4K once zoomed in; a Retina
 * desktop window of 1440 x 900 at the medium tier (its globe 547 px tall, at pixel ratio 1.75) climbs to 2K at the
 * opening view.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

// A colour map comes as KTX2 where the GPU takes it (VENT-101; SwiftShader: BC1), at 2K and 4K.
const map = (name: string): RegExp => new RegExp(`/textures/moon-${name}\\.(jpg|ktx2)$`);
// The canvas is software-rendered in CI: a 4K map takes a while to decode.
const MAP_MS = 30_000;

/** The Moon map file names the page requests, in order. */
function mapRequests(page: Page): string[] {
  const requested: string[] = [];
  page.on('request', (r) => {
    if (/\/textures\/moon-l(roc|ola-normal)-\dk\.(jpg|ktx2)$/.test(r.url())) requested.push(r.url().split('/').pop() ?? '');
  });
  return requested;
}

/** Waits for the colour and relief maps of `level` (e.g. «2k») to arrive. */
async function arrives(page: Page, level: string): Promise<void> {
  const colour = page.waitForResponse(map(`lroc-${level}`), { timeout: MAP_MS });
  const relief = page.waitForResponse(map(`lola-normal-${level}`), { timeout: MAP_MS });
  for (const response of await Promise.all([colour, relief])) expect(response.ok()).toBe(true);
}

test.describe('the globe map, a Pixel-sized phone 412x880 at pixel ratio 1.75', () => {
  test.use({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 1.75, hasTouch: true, isMobile: true });

  test('opens on the 1K map, climbs to 2K at once, and to 4K after one zoom in', async ({ page }) => {
    await stubApi(page);
    const requested = mapRequests(page);
    const start = arrives(page, '1k');
    const sharper = arrives(page, '2k');
    await page.goto('./?quality=medium');
    await start;
    await sharper;
    expect(requested.slice(0, 2).sort()).toEqual(['moon-lola-normal-1k.jpg', 'moon-lroc-1k.jpg']);
    await page.waitForLoadState('networkidle');
    expect(requested.filter((name) => name.includes('-4k'))).toEqual([]);
    const zoomed = arrives(page, '4k');
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    await page.keyboard.press('+');
    await zoomed;
  });
});

test.describe('the globe map, Retina desktop 1440x900 at the medium tier', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('climbs from the 1K start map to 2K at the opening view, and no further', async ({ page }) => {
    await stubApi(page);
    const requested = mapRequests(page);
    const sharper = arrives(page, '2k');
    await page.goto('./?quality=medium');
    await sharper;
    await page.waitForLoadState('networkidle');
    expect(requested.sort()).toEqual([
      'moon-lola-normal-1k.jpg',
      'moon-lola-normal-2k.jpg',
      'moon-lroc-1k.jpg',
      'moon-lroc-2k.ktx2',
    ]);
  });
});
