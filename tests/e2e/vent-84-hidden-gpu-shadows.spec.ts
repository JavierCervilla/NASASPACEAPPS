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
 * A phone whose GPU the browser hides draws the on-foot view with its shadow map in two linear passes (VENT-114);
 * with the single-pass logarithmic depth it draws it without the shadow map (VENT-84): the Pixel 10's
 * PowerVR was not recognised, the VENT-75 guard did not apply and the benchmark lost both contexts. A browser may hide
 * it two ways: no WEBGL_debug_renderer_info, or a name that is no GPU's, as Brave's «Brave» (VENT-92: the view lost its
 * context after 9.8 s of turning at tier low). A desktop with its GPU hidden keeps its shadows.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });

/** How the browser hides the GPU: no WEBGL_debug_renderer_info, or a renderer name that is no GPU's. */
type Hiding = { readonly kind: 'absent' } | { readonly kind: 'named'; readonly name: string };

/** Opens the view with the GPU hidden as `hiding` says; returns the shadow passes drawn. */
async function openHidden(page: Page, hiding: Hiding = { kind: 'absent' }, query = ''): Promise<number> {
  await page.clock.setFixedTime(new Date('2026-11-30T20:00:00Z'));
  await page.addInitScript((how: Hiding) => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    const UNMASKED_RENDERER = 0x9246;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const real = proto.getExtension as (this: WebGLRenderingContext, name: string) => unknown;
      proto.getExtension = function (this: WebGLRenderingContext, name: string) {
        return how.kind === 'absent' && name === 'WEBGL_debug_renderer_info' ? null : real.call(this, name);
      } as typeof proto.getExtension;
      if (how.kind !== 'named') continue;
      const param = proto.getParameter as (this: WebGLRenderingContext, p: number) => unknown;
      proto.getParameter = function (this: WebGLRenderingContext, p: number) {
        return p === UNMASKED_RENDERER ? how.name : param.call(this, p);
      } as typeof proto.getParameter;
    }
  }, hiding);
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

test.describe('on a phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('with its GPU hidden it draws two linear passes without the shadow map', async ({ page }) => {
    expect(await openHidden(page)).toBe(0);
    await expect(host(page)).toHaveAttribute('data-depth', 'split');
  });

  test('with its GPU hidden and the logarithmic depth asked for it renders the shadow map none of the times', async ({ page }) => {
    expect(await openHidden(page, { kind: 'absent' }, '&depth=log')).toBe(0);
  });

  test('with its GPU named «Brave» and the logarithmic depth asked for it renders it none of the times (VENT-92)', async ({ page }) => {
    expect(await openHidden(page, { kind: 'named', name: 'Brave' }, '&depth=log')).toBe(0);
  });

  test('with its GPU named «Brave» it draws two linear passes without the shadow map', async ({ page }) => {
    expect(await openHidden(page, { kind: 'named', name: 'Brave' })).toBe(0);
  });
});

test('a desktop with its GPU hidden still renders it', async ({ page }) => {
  expect(await openHidden(page)).toBeGreaterThan(0);
});
