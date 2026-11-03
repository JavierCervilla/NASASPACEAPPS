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
 * Two mitigations for a Pixel whose GPU went down under the on-foot view (VENT-51): the hidden globe draws nothing,
 * and a run that ended without an unmount steps the next one down.
 *
 * The phone's report: the previous run turned for 33 s and died at the minute tick of the live clock, with no loss
 * recorded and no unmount; the next run opened at the same tier and lost its context 4 s in. On a phone the globe is
 * only hidden (still mounted, its own WebGL context) while the Horizon view shows, and each minute tick of the shared
 * instant asked it for a frame into the hidden canvas, resized to the hidden host's 0 x 0. The cause on the device is
 * not confirmed: these are mitigations.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-22T20:00:00Z');
const POINT = '?lat=-85.50&lon=40.00';
const START_MS = 30_000;

/** Counts the GL calls that draw (clears and draws) on each canvas, as `data-gl-calls` on the canvas itself. */
async function countGlCalls(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const names = ['clear', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'];
    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const proto = Context.prototype as unknown as Record<string, unknown>;
      for (const name of names) {
        const original = proto[name];
        if (typeof original !== 'function') continue;
        proto[name] = function (this: { canvas: HTMLCanvasElement }, ...args: unknown[]) {
          const canvas = this.canvas;
          if (canvas instanceof HTMLCanvasElement) canvas.dataset['glCalls'] = String(Number(canvas.dataset['glCalls'] ?? 0) + 1);
          return (original as (...a: unknown[]) => unknown).apply(this, args);
        };
      }
    }
  });
}

async function open(page: Page, path: string): Promise<void> {
  await page.clock.install({ time: AT });
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubWall(page, 300, 330);
  await stubTile(page);
  await page.goto(path);
}

const view = (page: Page) => page.getByRole('region', { name: 'On foot at the site' });
const host = (page: Page) => view(page).getByRole('application', { name: 'On foot at the site' });
const globeCanvas = (page: Page) => page.locator('.globe-viewport canvas');
const globeCalls = async (page: Page): Promise<number> => Number(await globeCanvas(page).getAttribute('data-gl-calls'));

/** Waits until the globe's canvas has made no GL call for 600 ms, and returns the count. */
async function globeQuiet(page: Page): Promise<number> {
  let last = -1;
  await expect
    .poll(async () => {
      const now = await globeCalls(page);
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [600], timeout: 15_000 })
    .toBe(true);
  return last;
}

interface Step {
  readonly text: string;
}
interface Kept {
  readonly current?: { readonly startedAt: string; readonly steps: readonly Step[] };
  readonly previous?: { readonly startedAt: string; readonly steps: readonly Step[] };
}

const kept = (page: Page): Promise<Kept> =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('ventana.onFootReport') ?? '{}') as Kept);

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the hidden globe draws nothing across the live clock\'s minute ticks, keeps its size, and draws again on return', async ({ page }) => {
    await countGlCalls(page);
    await open(page, `./${POINT}`);
    await expect.poll(() => globeCalls(page), { timeout: START_MS }).toBeGreaterThan(0);
    const tabs = page.getByRole('navigation', { name: 'Views' });
    await tabs.getByRole('button', { name: 'Horizon' }).click();
    await expect(page.locator('.globe')).toBeHidden();
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    const quiet = await globeQuiet(page);
    const size = await globeCanvas(page).evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height]);
    expect(Math.min(...size)).toBeGreaterThan(0);
    // runFor steps the installed clock through three whole minutes, so the follow-clock ticks inside it whatever the
    // wall time did before; the on-foot view's skipped relights prove the ticks reached the shared instant.
    await page.clock.runFor('03:00');
    await expect.poll(async () => (await kept(page)).current?.steps.some((step) => step.text.startsWith('instant skipped'))).toBe(true);
    await page.waitForTimeout(1500);
    expect(await globeCalls(page)).toBe(quiet);
    expect(await globeCanvas(page).evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height])).toEqual(size);

    await tabs.getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.globe')).toBeVisible();
    await expect.poll(() => globeCalls(page)).toBeGreaterThan(quiet);
  });
});

const DIED = /^tier dropped to (low|medium): previous run ended without unmount$/;
const LOWER: Record<string, string> = { high: 'medium', medium: 'low', low: 'low' };

/** Hides the GPU's name, so the device reads as a capable laptop and the view opens at high (lib/quality.ts). */
async function hideGpuName(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const proto = Context.prototype as unknown as { getExtension: (this: unknown, name: string) => unknown };
      const getExtension = proto.getExtension;
      proto.getExtension = function (this: unknown, name: string) {
        return name === 'WEBGL_debug_renderer_info' ? null : getExtension.call(this, name);
      };
    }
  });
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a run the page did not unmount opens the next one a rung lower, once, and the report says why', async ({ page }) => {
    await hideGpuName(page);
    await open(page, `./${POINT}#horizon`);
    await expect.poll(async () => (await kept(page)).current?.steps[0]?.text, { timeout: START_MS }).toBe('mount at tier high');
    const died = await kept(page);
    // The page goes with the view open: no unmount runs, as when the GPU takes the page down.
    const tier = await page.evaluate(() => sessionStorage.getItem('ventana.onFootTier') ?? 'high');
    await page.reload();
    const lower = LOWER[tier] ?? 'low';
    await expect.poll(async () => (await kept(page)).previous?.startedAt, { timeout: START_MS }).toBe(died.current?.startedAt);
    const second = (await kept(page)).current;
    expect(second?.steps[0]?.text).toBe(`mount at tier ${lower}`);
    expect(second?.steps.filter((step) => DIED.test(step.text)).map((step) => step.text))
      .toEqual([`tier dropped to ${lower}: previous run ended without unmount`]);

    // Leaving the view is an unmount: the next page opens it with no step down. The tier's memory is cleared first, so
    // the next run could still step down from high (this run's own frame probe may have taken it to low).
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Globe' }).click();
    await expect(view(page)).toHaveCount(0);
    await page.evaluate(() => sessionStorage.removeItem('ventana.onFootTier'));
    await page.reload();
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
    await expect.poll(async () => (await kept(page)).previous?.startedAt, { timeout: START_MS }).toBe(second?.startedAt);
    const third = (await kept(page)).current;
    expect(third?.steps[0]?.text).toBe('mount at tier high');
    expect(third?.steps.some((step) => DIED.test(step.text))).toBe(false);
  });

  test('switching the language with the view open is a navigation the app made, not a died run (VENT-52)', async ({ page }) => {
    await hideGpuName(page);
    await open(page, `./${POINT}#horizon`);
    await expect.poll(async () => (await kept(page)).current?.steps[0]?.text, { timeout: START_MS }).toBe('mount at tier high');
    const first = await kept(page);
    await page.getByRole('button', { name: 'Language: English' }).click();
    await page.getByRole('menuitemradio', { name: /^Español/ }).click();
    await expect(page).toHaveURL(/\/es\/\?lat=-85\.50&lon=40\.00#horizon$/);
    await expect.poll(async () => (await kept(page)).previous?.startedAt, { timeout: START_MS }).toBe(first.current?.startedAt);
    const second = (await kept(page)).current;
    expect(second?.steps.some((step) => DIED.test(step.text))).toBe(false);
  });
});
