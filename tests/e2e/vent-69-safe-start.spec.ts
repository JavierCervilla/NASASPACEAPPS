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
 * The on-foot view's safe start (VENT-69, after a Pixel 10's GPU reset): medium and low draw the ground at its
 * pre-VENT-62 cost (the compiled fragment shader has no lunar photometry, second normal read, footprint fade or fine
 * relief, and no fine tile is asked for), high keeps them; the ground compiles once, with its maps, before the first
 * frame; and a browser that blocks WebGL after a graphics fault says so in the globe and in the view, where one that
 * never had WebGL keeps today's words.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';

const AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;
const FINE_FILES = /\/fine-tiles\//;
/** What only the ground's fragment shader carries (sun-mask.ts's per-vertex varying). */
const GROUND = 'vLit';

/** Keeps every fragment shader source the page hands to WebGL, in `window.__fragments`. */
async function recordShaders(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __fragments: string[] };
    w.__fragments = [];
    const proto = WebGL2RenderingContext.prototype;
    const original = proto.shaderSource;
    proto.shaderSource = function (this: WebGL2RenderingContext, shader: WebGLShader, source: string) {
      if (source.includes('gl_FragColor') || source.includes('pc_fragColor')) w.__fragments.push(source);
      return original.call(this, shader, source);
    };
  });
}

const groundShaders = (page: Page): Promise<string[]> =>
  page.evaluate((mark) => (window as unknown as { __fragments: string[] }).__fragments.filter((s) => s.includes(mark)), GROUND);

async function openView(page: Page, query: string, requests: string[] = []): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  page.on('request', (request) => requests.push(request.url()));
  await recordShaders(page);
  await stubApi(page);
  await stubRealRelief(page);
  await page.goto(`./?site=im2-athena&${query}`);
  await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
  const host = page.getByRole('region', { name: 'On foot at the site' }).getByRole('application', { name: 'On foot at the site' });
  await expect(host).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host.getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(0);
}

test.describe('the ground per tier (IM-2 stands inside a fine tile)', () => {
  for (const tier of ['medium', 'low']) {
    test(`at ${tier} the ground shader has no VENT-62 cost and no fine tile is asked for`, async ({ page }) => {
      const requests: string[] = [];
      await openView(page, `quality=${tier}`, requests);
      const sources = await groundShaders(page);
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        expect(source).not.toContain('RE_Direct_Ground');
        expect(source).not.toContain('tiledNormal');
        expect(source).not.toContain('footMpp');
        expect(source).not.toContain('uFineTex');
      }
      expect(requests.filter((url) => FINE_FILES.test(url))).toEqual([]);
      await expect(page.locator('.on-foot__caption')).not.toContainText('LROC NAC DTM');
    });
  }

  test('at high the ground shader has all of it and the fine relief is asked for and named', async ({ page }) => {
    const requests: string[] = [];
    await openView(page, 'quality=high', requests);
    const sources = await groundShaders(page);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      for (const part of ['RE_Direct_Ground', 'tiledNormal', 'footMpp', 'uFineTex']) expect(source).toContain(part);
    }
    expect(requests.filter((url) => FINE_FILES.test(url)).length).toBeGreaterThan(0);
    await expect(page.locator('.on-foot__caption')).toContainText('LROC NAC DTM');
  });

  test('?onfoot= leaves a part out of the high tier by its word', async ({ page }) => {
    const requests: string[] = [];
    await openView(page, 'quality=high&onfoot=photometry,fine', requests);
    for (const source of await groundShaders(page)) {
      expect(source).not.toContain('RE_Direct_Ground');
      expect(source).not.toContain('uFineTex');
      expect(source).toContain('tiledNormal');
    }
    expect(requests.filter((url) => FINE_FILES.test(url))).toEqual([]);
  });

  // The ground used to compile twice: without its maps, then again when they landed (a program per variant each time).
  test('compiles the ground once, with its maps, before the first frame', async ({ page }) => {
    await openView(page, 'quality=medium');
    const sources = await groundShaders(page);
    for (const source of sources) expect(source).toContain('#define USE_MAP');
    expect(new Set(sources).size).toBe(sources.length);
  });
});

test.describe('the surface maps stall', () => {
  // A download that never ends must not keep the view from drawing: the wait is capped (5 s) and the view draws without them.
  test('the view draws after the cap, without the maps', async ({ page }) => {
    await page.route(/on-foot-(regolith-albedo|regolith-normal|earth).*\.webp/, () => undefined);
    await openView(page, 'quality=medium');
    const host = page.getByRole('application', { name: 'On foot at the site' });
    expect(Number(await host.getAttribute('data-frames'))).toBeGreaterThan(0);
  });
});

test.describe('WebGL blocked after a fault', () => {
  const BLOCKED = /blocked 3D for this site after a graphics fault/;

  /** `getContext` answers null for WebGL, as Chrome does once it has blocked the site; `marked`: a context worked before. */
  async function blockWebGl(page: Page, marked: boolean): Promise<void> {
    await page.addInitScript((worked) => {
      if (worked) localStorage.setItem('ventana.glWorked', String(Date.now()));
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (/webgl/.test(type)) return null;
        return (getContext as (...args: unknown[]) => unknown).call(this, type, ...rest) as never;
      } as typeof getContext;
    }, marked);
  }

  async function openBlocked(page: Page, marked: boolean, hash: string): Promise<void> {
    await page.clock.setFixedTime(AT);
    await page.addInitScript(() => {
      localStorage.setItem('ventana.dataSource', 'computed');
      localStorage.setItem('ventana.pinHint', 'seen');
    });
    await blockWebGl(page, marked);
    await stubApi(page);
    await stubRealRelief(page);
    await page.goto(`./?site=im2-athena&quality=low${hash}`);
  }

  test('the globe says the browser blocked 3D, and how to recover, after a recorded success', async ({ page }) => {
    await openBlocked(page, true, '');
    await expect(page.locator('.globe-viewport')).toHaveAttribute('data-status', 'blocked', { timeout: START_MS });
    await expect(page.locator('.globe-help')).toHaveText(BLOCKED);
    await expect(page.locator('.globe-help')).toContainText('Force stop');
  });

  test('the on-foot view says it too', async ({ page }) => {
    await openBlocked(page, true, '#horizon');
    await expect(page.locator('.on-foot__status')).toContainText(BLOCKED, { timeout: START_MS });
  });

  test('keeps today\'s words when WebGL never worked here', async ({ page }) => {
    await openBlocked(page, false, '#horizon');
    await expect(page.locator('.globe-viewport')).toHaveAttribute('data-status', 'unavailable', { timeout: START_MS });
    await expect(page.locator('.globe-help')).toContainText('needs WebGL');
    await expect(page.locator('.on-foot__status')).toContainText('cannot start on this device', { timeout: START_MS });
    await expect(page.locator('.on-foot__status')).not.toContainText(BLOCKED);
  });

  test('records a context that worked, for the next visit', async ({ page }) => {
    await page.clock.setFixedTime(AT);
    await stubApi(page);
    await page.goto('./?site=im2-athena&quality=low');
    await expect(page.locator('.globe-viewport')).toHaveAttribute('data-status', 'ready', { timeout: START_MS });
    expect(await page.evaluate(() => localStorage.getItem('ventana.glWorked'))).toMatch(/^\d+$/);
  });
});
