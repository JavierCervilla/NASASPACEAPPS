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
 * A phone whose GPU the browser hides draws the on-foot view without its shadow map (VENT-84): Brave hides
 * WEBGL_debug_renderer_info, so the Pixel 10's PowerVR was not recognised, the VENT-75 guard did not apply and the
 * benchmark lost both contexts. A desktop with its GPU hidden keeps its shadows.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });

/** Opens the view with WEBGL_debug_renderer_info hidden, as Brave does; returns the shadow passes drawn. */
async function openHidden(page: Page): Promise<number> {
  await page.clock.setFixedTime(new Date('2026-11-30T20:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const real = proto.getExtension as (this: WebGLRenderingContext, name: string) => unknown;
      proto.getExtension = function (this: WebGLRenderingContext, name: string) {
        return name === 'WEBGL_debug_renderer_info' ? null : real.call(this, name);
      } as typeof proto.getExtension;
    }
  });
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far#horizon');
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS })
    .toBeGreaterThan(0);
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  return Number(await host(page).getAttribute('data-shadows'));
}

test.describe('on a phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('with its GPU hidden it renders the shadow map none of the times', async ({ page }) => {
    expect(await openHidden(page)).toBe(0);
  });
});

test('a desktop with its GPU hidden still renders it', async ({ page }) => {
  expect(await openHidden(page)).toBeGreaterThan(0);
});
