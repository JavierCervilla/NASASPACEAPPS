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
 * Point 8 of VENT-80 (VENT-103): the address picks the on-foot view's depth buffer, `?depth=log|linear|reversed`,
 * and `?shadows=force` draws the shadow map on a GPU the safety rules turn it off for, so the human can bisect the
 * Pixel 10's context loss from the phone. The GPU's name is spoofed as the Pixel's PowerVR; the choice shows in
 * `data-depth`, the shadow passes in `data-shadows`, and the crash report notes the depth buffer's bits.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;
const PIXEL = 'ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)';

const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });

interface Drawn {
  readonly depth: string | null;
  readonly shadows: number;
  readonly report: string;
  /** Where the Sun and the Earth fall on the host, empty when off screen or behind the eye. */
  readonly marks: readonly (string | null)[];
  readonly errors: readonly string[];
}

async function open(page: Page, query: string): Promise<Drawn> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-30T20:00:00Z'));
  await page.addInitScript((name) => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const real = proto.getParameter;
      proto.getParameter = function (this: WebGLRenderingContext, p: number) {
        return p === 0x9246 ? name : real.call(this, p);
      };
    }
  }, PIXEL);
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  await page.goto(`./?site=im2-athena&quality=low&onfoot=far${query}#horizon`);
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS })
    .toBeGreaterThan(0);
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  return {
    depth: await host(page).getAttribute('data-depth'),
    shadows: Number(await host(page).getAttribute('data-shadows')),
    report: await page.evaluate(() => sessionStorage.getItem('ventana.onFootReport') ?? ''),
    marks: [await host(page).getAttribute('data-sun-at'), await host(page).getAttribute('data-earth-at')],
    errors,
  };
}

test('the PowerVR keeps the logarithmic depth and no shadow map by default', async ({ page }) => {
  const drawn = await open(page, '');
  expect(drawn).toMatchObject({ depth: 'log', shadows: 0, errors: [] });
  expect(drawn.report).toMatch(/depth log · \d+ bits · shadow map off/);
});

test('?depth=linear&shadows=force draws a linear depth with the shadow map', async ({ page }) => {
  const drawn = await open(page, '&depth=linear&shadows=force');
  expect(drawn).toMatchObject({ depth: 'linear', errors: [] });
  expect(drawn.shadows).toBeGreaterThan(0);
  expect(drawn.report).toMatch(/depth linear · \d+ bits · shadow map on \(forced\)/);
});

test('?depth=reversed reverses the depth where EXT_clip_control is, else keeps the logarithmic one', async ({ page }) => {
  const drawn = await open(page, '&depth=reversed&shadows=force');
  expect(drawn.errors).toEqual([]);
  expect(drawn.shadows).toBeGreaterThan(0);
  const clip = await page.evaluate(() =>
    document.createElement('canvas').getContext('webgl2')?.getExtension('EXT_clip_control') != null);
  expect(drawn.depth).toBe(clip ? 'reversed' : 'log');
  expect(drawn.report).toMatch(clip ? /depth reversed · \d+ bits/ : /depth log \(asked reversed\)/);
});

/** Opens the view, turns it half a turn (5° a key) and returns every Sun and Earth mark, at opening and after. */
async function marksAfterHalfTurn(page: Page, query: string): Promise<(string | null)[]> {
  const opened = await open(page, query);
  await host(page).focus();
  const frames = Number(await host(page).getAttribute('data-frames'));
  for (let k = 0; k < 36; k += 1) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames'))).toBeGreaterThan(frames);
  await expect(host(page)).toHaveAttribute('data-working', 'false');
  return [...opened.marks, await host(page).getAttribute('data-sun-at'), await host(page).getAttribute('data-earth-at')];
}

// One view a test, so each keeps within the usual budget; serial, so the second compares with the first.
test.describe.serial('the reversed depth marks no body behind the eye, as the logarithmic one does', () => {
  let logarithmic: (string | null)[] = [];

  test('the logarithmic depth leaves a body behind the eye unmarked', async ({ page }) => {
    logarithmic = await marksAfterHalfTurn(page, '');
    expect(logarithmic.slice(2)).toContain('');
  });

  test('the reversed depth marks the same places', async ({ page }) => {
    expect(await marksAfterHalfTurn(page, '&depth=reversed')).toEqual(logarithmic);
  });
});
