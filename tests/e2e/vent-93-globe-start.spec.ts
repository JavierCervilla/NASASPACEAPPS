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
 * The globe starts sooner (VENT-93, VENT-80 findings 5 and 6). The start maps of the tier (1K colour and relief, or
 * 2K on the high tier) are asked as soon as the tier is known, before the globe's chunk is even requested, and the
 * swapper takes those very images: each map is requested once, and no other level's map is asked at start. Under
 * Save-Data nothing is asked before «Load the 3D globe». Three no longer reads the shader info logs after each link
 * (they made the driver finish the compile on the spot) unless the page runs with `?debug`, and where the browser has
 * KHR_parallel_shader_compile the programs are compiled before the first frame draws.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const MOON_MAP = /\/textures\/moon-l(roc|ola-normal)-\dk\.jpg$/;
const GLOBE_CHUNK = /\/_astro\/globe\.[^/]*\.js$/;
// The canvas is software-rendered in CI; the splash leaves at the first map or after 6 s (GlobeSplash.tsx).
const TEXTURED_MS = 20_000;

/** Records when the page sets a Moon map's `src` (the map is asked), in ms since navigation. */
async function recordAsks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const asked: [string, number][] = [];
    Object.assign(window, { __moonAsks: asked });
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      get() {
        return src?.get?.call(this);
      },
      set(value: string) {
        if (/moon-l(roc|ola-normal)-/.test(value)) asked.push([value.split('/').pop() ?? value, performance.now()]);
        src?.set?.call(this, value);
      },
    });
  });
}

/** The Moon maps the page requested, by file name. */
function mapRequests(page: Page): string[] {
  const requested: string[] = [];
  page.on('request', (r) => {
    if (MOON_MAP.test(r.url())) requested.push(r.url().split('/').pop() ?? '');
  });
  return requested;
}

async function waitTextured(page: Page): Promise<void> {
  await expect(page.locator('.globe-splash')).toHaveAttribute('data-done', 'true', { timeout: TEXTURED_MS });
  await expect(page.locator('.globe-viewport')).toHaveAttribute('data-status', 'ready');
}

test.describe('the globe start, phone 390x844 at medium', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('asks the 1K colour and relief before the globe chunk is requested, and requests each once', async ({ page }) => {
    await stubApi(page);
    await recordAsks(page);
    const requested = mapRequests(page);
    await page.goto('./?quality=medium');
    await waitTextured(page);
    const { asks, chunkAt } = await page.evaluate(() => ({
      asks: (window as unknown as { __moonAsks: [string, number][] }).__moonAsks,
      chunkAt: performance.getEntriesByType('resource').find((e) => /\/_astro\/globe\.[^/]*\.js$/.test(e.name))?.startTime,
    }));
    expect(asks.map(([name]) => name).sort()).toEqual(['moon-lola-normal-1k.jpg', 'moon-lroc-1k.jpg']);
    expect(chunkAt).toBeDefined();
    for (const [, at] of asks) expect(at).toBeLessThanOrEqual(chunkAt ?? 0);
    expect(requested.sort()).toEqual(['moon-lola-normal-1k.jpg', 'moon-lroc-1k.jpg']);
  });

  test('under Save-Data asks no map before «Load the 3D globe», then the start maps once', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    // A still clock, as phone.spec.ts's Save-Data run has: the page then goes quiet on the network.
    await page.clock.setFixedTime(new Date('2026-11-22T20:00:00Z'));
    await stubApi(page);
    const requested = mapRequests(page);
    const chunks: string[] = [];
    page.on('request', (r) => GLOBE_CHUNK.test(r.url()) && chunks.push(r.url()));
    await page.goto('./?quality=medium');
    const load = page.getByRole('button', { name: 'Load the 3D globe' });
    await expect(load).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([]);
    expect(chunks).toEqual([]);
    await load.click();
    await waitTextured(page);
    expect(requested.sort()).toEqual(['moon-lola-normal-1k.jpg', 'moon-lroc-1k.jpg']);
  });
});

test.describe('the globe start, desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('at the high tier asks the 2K maps only, once each', async ({ page }) => {
    await stubApi(page);
    const requested = mapRequests(page);
    await page.goto('./?quality=high');
    await waitTextured(page);
    await page.waitForLoadState('networkidle');
    expect(requested.sort()).toEqual(['moon-lola-normal-2k.jpg', 'moon-lroc-2k.jpg']);
  });

  /** Counts the shader and program info log reads of every WebGL context. */
  async function countInfoLogs(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const counts = { reads: 0 };
      Object.assign(window, { __infoLogs: counts });
      for (const gl of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
        for (const name of ['getShaderInfoLog', 'getProgramInfoLog'] as const) {
          const read = gl[name] as (...args: unknown[]) => unknown;
          Object.defineProperty(gl, name, {
            configurable: true,
            value(this: unknown, ...args: unknown[]) {
              counts.reads += 1;
              return read.apply(this, args);
            },
          });
        }
      }
    });
  }

  const infoLogReads = (page: Page) =>
    page.evaluate(() => (window as unknown as { __infoLogs: { reads: number } }).__infoLogs.reads);

  test('reads no shader info log without ?debug', async ({ page }) => {
    await stubApi(page);
    await countInfoLogs(page);
    await page.goto('./');
    await waitTextured(page);
    expect(await infoLogReads(page)).toBe(0);
  });

  test('with ?debug three checks every shader again', async ({ page }) => {
    await stubApi(page);
    await countInfoLogs(page);
    await page.goto('./?debug');
    await waitTextured(page);
    expect(await infoLogReads(page)).toBeGreaterThan(0);
  });

  test('with KHR_parallel_shader_compile, the programs are compiled before the first frame draws', async ({ page }) => {
    await stubApi(page);
    // SwiftShader has no such extension: it is offered here, every program reported complete when asked.
    await page.addInitScript(() => {
      const COMPLETION_STATUS_KHR = 0x91b1;
      const events: string[] = [];
      Object.assign(window, { __glEvents: events });
      const gl = WebGL2RenderingContext.prototype;
      const getExtension = gl.getExtension as (this: WebGL2RenderingContext, name: string) => unknown;
      gl.getExtension = function (this: WebGL2RenderingContext, name: string) {
        if (name === 'KHR_parallel_shader_compile') return { COMPLETION_STATUS_KHR };
        return getExtension.call(this, name);
      } as typeof gl.getExtension;
      const getProgramParameter = gl.getProgramParameter;
      gl.getProgramParameter = function (this: WebGL2RenderingContext, program: WebGLProgram, pname: number) {
        if (pname !== COMPLETION_STATUS_KHR) return getProgramParameter.call(this, program, pname);
        events.push('ready?');
        return true;
      } as typeof gl.getProgramParameter;
      const drawElements = gl.drawElements;
      gl.drawElements = function (this: WebGL2RenderingContext, ...args: Parameters<typeof drawElements>) {
        events.push('draw');
        return drawElements.apply(this, args);
      };
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./');
    await waitTextured(page);
    const events = await page.evaluate(() => (window as unknown as { __glEvents: string[] }).__glEvents);
    expect(events.indexOf('ready?')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('draw')).toBeGreaterThan(events.indexOf('ready?'));
    expect(errors).toEqual([]);
  });
});
