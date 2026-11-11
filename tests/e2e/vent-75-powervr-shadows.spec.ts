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
 * A PowerVR draws the on-foot view with its shadow map again (VENT-114): on the human's Pixel 10 a frame that sampled
 * the shadow map and wrote a logarithmic depth lost the GPU context after seconds of turning (VENT-75), but two passes
 * of linear depth (`data-depth="split"`) survive it. The single-pass logarithmic depth, asked for by the address,
 * still draws without the shadow map there. The GPU's name is spoofed through WEBGL_debug_renderer_info.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;
const PIXEL = 'ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)';

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });

async function open(page: Page, gpu: string | null, query = ''): Promise<number> {
  await page.clock.setFixedTime(new Date('2026-11-30T20:00:00Z'));
  await page.addInitScript((name) => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    if (!name) return;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const real = proto.getParameter;
      proto.getParameter = function (this: WebGLRenderingContext, p: number) {
        return p === 0x9246 ? name : real.call(this, p);
      };
    }
  }, gpu);
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far' + query + '#horizon');
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS })
    .toBeGreaterThan(0);
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  return Number(await host(page).getAttribute('data-shadows'));
}

// A Pixel 10 lost its context with the split draw and the shadow map after ten seconds of turning (2026-11-10).
test('a PowerVR draws two linear passes without the shadow map', async ({ page }) => {
  expect(await open(page, PIXEL)).toBe(0);
  await expect(host(page)).toHaveAttribute('data-depth', 'split');
});

test('a PowerVR asked for the single-pass logarithmic depth renders the shadow map none of the times', async ({ page }) => {
  expect(await open(page, PIXEL, '&depth=log')).toBe(0);
  await expect(host(page)).toHaveAttribute('data-depth', 'log');
});

test('another GPU still renders it', async ({ page }) => {
  expect(await open(page, null)).toBeGreaterThan(0);
});
