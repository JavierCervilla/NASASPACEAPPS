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
 * VENT-91: the device is probed once per page, and the Liquid glass's lens maps are drawn on a canvas kept in memory
 * (`willReadFrequently`). Before, every quality pick made and dropped a WebGL2 context (the glass gate, the globe, its
 * contents, the on-foot view: 4 contexts at load, 6 with the view), and `toDataURL()` read each lens map back from a
 * GPU-backed canvas on the main thread. The glass must look the same: the PNG each lens carries decodes to exactly the
 * map lens-map.ts makes for that surface's box.
 */
import { expect, test, type Page } from '@playwright/test';
import { lensBezel, lensMap } from '../../packages/web/src/glass/lens-map';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const NOW = new Date('2026-11-23T18:00:00Z');

/** Counts every WebGL context the page creates, from before its scripts run. */
async function countContexts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const made = new WeakSet<object>();
    const w = window as unknown as { glContexts: number };
    w.glContexts = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
      const context = (getContext as (...a: unknown[]) => RenderingContext | null).apply(this, args);
      if (context && /webgl/.test(String(args[0])) && !made.has(context)) {
        made.add(context);
        w.glContexts++;
      }
      return context;
    } as typeof getContext;
  });
}

const contexts = (page: Page) => page.evaluate(() => (window as unknown as { glContexts: number }).glContexts);

async function open(page: Page, query: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await countContexts(page);
  await stubApi(page);
  await stubWall(page, 300, 330);
  await stubTile(page);
  await page.goto(`./${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-glass', /^(liquid|frosted)$/);
}

interface DrawnLens {
  readonly href: string;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  /** The decoded map's RGBA bytes, base64. */
  readonly rgba: string;
}

/**
 * The lens each of `selectors` names in its own --glass-lens, once each has its PNG: its feImage href, its size, the
 * surface's corner radius (as lens-surfaces.ts reads it), and the map the browser decodes from the href.
 */
async function drawnLenses(page: Page, selectors: readonly string[]): Promise<DrawnLens[]> {
  const ready = () =>
    page.evaluate(
      (list) =>
        list.every((selector) => {
          const el = document.querySelector<HTMLElement>(selector);
          const id = el ? /url\(#([\w-]+)\)/.exec(el.style.getPropertyValue('--glass-lens'))?.[1] : null;
          return Boolean(id && document.querySelector(`.glass-defs filter#${id} feImage[href^="data:image/"]`));
        }),
      selectors,
    );
  await expect.poll(ready, { timeout: 5_000 }).toBe(true);
  return page.evaluate(
    (list) =>
      Promise.all(
        list.map(async (selector) => {
          const el = document.querySelector<HTMLElement>(selector)!;
          const id = /url\(#([\w-]+)\)/.exec(el.style.getPropertyValue('--glass-lens'))![1];
          const image = document.querySelector(`.glass-defs filter#${id} feImage`)!;
          const href = image.getAttribute('href')!;
          const [width, height] = ['width', 'height'].map((name) => Number(image.getAttribute(name)));
          const decoded = new Image();
          decoded.src = href;
          await decoded.decode();
          const canvas = document.createElement('canvas');
          Object.assign(canvas, { width, height });
          const context = canvas.getContext('2d', { willReadFrequently: true })!;
          context.drawImage(decoded, 0, 0);
          const bytes = context.getImageData(0, 0, width!, height!).data;
          let binary = '';
          for (let at = 0; at < bytes.length; at += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
          }
          const radius = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
          return { href, width: width!, height: height!, radius, rgba: btoa(binary) };
        }),
      ),
    selectors,
  );
}

/** How many bytes of `lens`'s decoded map differ from the map lens-map.ts makes for its box. */
function differingBytes(lens: DrawnLens): number {
  const { width, height, radius } = lens;
  const expected = lensMap({ width, height, radius, bezel: lensBezel(width, height) });
  const drawn = Buffer.from(lens.rgba, 'base64');
  expect(drawn.length).toBe(expected.length);
  return expected.reduce((count, byte, at) => count + (drawn[at] === byte ? 0 : 1), 0);
}

for (const [name, viewport, isMobile, surfaces] of [
  ['desktop', { width: 1440, height: 900 }, false, ['.bar', '.strip', '.card-block']],
  ['phone', { width: 390, height: 844 }, true, ['.phone-bar', '.sheet', '.tab-bar']],
] as const) {
  test.describe(`${name}, ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile, hasTouch: isMobile });

    test('each Liquid lens is a PNG that decodes to exactly its lens map', async ({ page }) => {
      await open(page, '?glass=liquid');
      await expect(page.locator('html')).toHaveAttribute('data-glass', 'liquid');
      await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
      const lenses = await drawnLenses(page, surfaces);
      expect(lenses).toHaveLength(surfaces.length);
      for (const lens of lenses) {
        expect(lens.href).toMatch(/^data:image\/png;base64,/);
        expect(differingBytes(lens), `${lens.width}x${lens.height}`).toBe(0);
      }
    });
  });
}

test.describe('desktop, 1440x900, the WebGL probe', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('one probe for the page: the globe and the probe at load, then only the on-foot view', async ({ page }) => {
    await open(page, '?quality=high');
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    await page.waitForLoadState('networkidle');
    expect(await contexts(page)).toBe(2);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
    const host = page.getByRole('application', { name: 'On foot at the site' });
    await expect(host).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    expect(await contexts(page)).toBe(3);
  });
});
