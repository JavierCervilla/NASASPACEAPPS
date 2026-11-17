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
 * A hidden globe keeps only its start map (VENT-86): on a phone the 3D and DSN views hide the globe but keep it
 * mounted, and its 4K maps (89 MB on the GPU on a Pixel 10) were held while the other view had the GPU. Hidden, the
 * Moon goes back to its start map and frees the bigger ones; shown again, the zoom climbs back. Each map three loads
 * sets an image's `src`, which the page records: the document's list of available images answers a second load of the
 * same URL without a request, so the network alone would not see it.
 *
 * VENT-127: the test used to hide the globe once the 4K colour's response came, while its relief could still be in
 * flight; the swapper fetches one level at a time, so the start map came only after the 4K landed, past the poll's
 * bound on a loaded runner. Each case now says which it means: hidden with the 4K on the Moon (both 4K maps given GPU
 * storage), or hidden with the 4K relief held back on purpose, when the 4K is freed on landing and the start map follows.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const MAP_1K = /\/textures\/moon-lroc-1k\.jpg$/;
// The 4K colour comes as KTX2 where the GPU takes it (VENT-101; SwiftShader: BC1), fetched rather than an image.
const MAP_4K = /\/textures\/moon-lroc-4k\.(jpg|ktx2)$/;
const MAP_4K_RELIEF = /\/textures\/moon-lola-normal-4k\.jpg$/;

/** The Moon maps the page has loaded so far, in order. */
const loaded = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { mapLoads: string[] }).mapLoads.filter((url) => /moon-lroc-/.test(url)));

/** Records every image `src` the page sets, and every map it fetches (a KTX2 map, VENT-101). */
function recordImageLoads(): void {
  const loads: string[] = [];
  (window as unknown as { mapLoads: string[] }).mapLoads = loads;
  const fetchOf = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    loads.push(input instanceof Request ? input.url : String(input));
    return fetchOf(input, init);
  };
  const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    ...src,
    set(this: HTMLImageElement, url: string) {
      loads.push(url);
      src?.set?.call(this, url);
    },
  });
}

/** Records the width of every 2D texture storage WebGL2 makes: three allocates each map with `texStorage2D`. */
function recordTextureStorage(): void {
  const widths: number[] = [];
  (window as unknown as { storageWidths: number[] }).storageWidths = widths;
  const proto = WebGL2RenderingContext.prototype;
  const storage = proto.texStorage2D;
  proto.texStorage2D = function (this: WebGL2RenderingContext, ...args: Parameters<typeof storage>) {
    widths.push(args[3]);
    return storage.apply(this, args);
  };
}

/** How many 4K maps (4096 texels wide) have GPU storage so far. */
const stored4k = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { storageWidths: number[] }).storageWidths.filter((w) => w === 4096).length);

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Views' });

/**
 * Zooms in with the keyboard until the 4K map is asked for, once the globe is mounted: the start map's response can
 * come from the early start (VENT-93) before the globe's chunk has bound its keys, and keys pressed then zoom nothing.
 */
async function zoomTo4k(page: Page): Promise<void> {
  await page.locator('.globe-viewport[data-status="ready"]').waitFor();
  const map4k = page.waitForResponse(MAP_4K);
  await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
  for (let step = 0; step < 4; step++) await page.keyboard.press('+');
  expect((await map4k).ok()).toBe(true);
}

test.describe('globe maps while the globe is hidden, phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('hidden, the globe goes back to its start map; shown, it climbs to 4K again', async ({ page }) => {
    await page.addInitScript(recordImageLoads);
    await page.addInitScript(recordTextureStorage);
    await stubApi(page);
    const start = page.waitForResponse(MAP_1K);
    await page.goto('./?quality=medium');
    await start;
    await zoomTo4k(page);
    // The 4K colour and relief both on the GPU: the 4K is on the Moon, nothing of it in flight. Waited for as an event,
    // under the test's own bound: how long the relief takes to land depends on the runner's load.
    await page.waitForFunction(() => (window as unknown as { storageWidths: number[] }).storageWidths
      .filter((w) => w === 4096).length === 2);
    const before = (await loaded(page)).length;
    const since = async (): Promise<string[]> => (await loaded(page)).slice(before);
    await tabs(page).getByRole('button', { name: 'DSN', exact: true }).click();
    await expect.poll(async () => (await since()).filter((url) => MAP_1K.test(url)).length).toBe(1);
    expect((await since()).filter((url) => MAP_4K.test(url))).toEqual([]);
    await tabs(page).getByRole('button', { name: 'Globe', exact: true }).click();
    await expect.poll(async () => (await since()).filter((url) => MAP_4K.test(url)).length).toBe(1);
  });

  test('hidden while the 4K relief is in flight, the 4K is freed when it lands and the start map follows', async ({ page }) => {
    await page.addInitScript(recordImageLoads);
    await page.addInitScript(recordTextureStorage);
    await stubApi(page);
    let releaseRelief = (): void => undefined;
    const held = new Promise<void>((resolve) => { releaseRelief = resolve; });
    await page.route(MAP_4K_RELIEF, async (route) => {
      await held;
      await route.continue();
    });
    const start = page.waitForResponse(MAP_1K);
    await page.goto('./?quality=medium');
    await start;
    await zoomTo4k(page);
    const before = (await loaded(page)).length;
    const since = async (): Promise<string[]> => (await loaded(page)).slice(before);
    await tabs(page).getByRole('button', { name: 'DSN', exact: true }).click();
    // One fetch at a time: while the 4K is in flight the start map waits for it.
    await page.waitForTimeout(1000);
    expect((await since()).filter((url) => MAP_1K.test(url)), 'no start map before the 4K lands').toEqual([]);
    const relief = page.waitForResponse(MAP_4K_RELIEF);
    releaseRelief();
    await relief;
    // The relief still decodes before the 4K lands and the start map is asked: an event, under the test's own bound.
    await page.waitForFunction((from) => (window as unknown as { mapLoads: string[] }).mapLoads.slice(from)
      .some((url) => /\/textures\/moon-lroc-1k\.jpg$/.test(url)), before);
    expect((await since()).filter((url) => MAP_1K.test(url))).toHaveLength(1);
    expect(await stored4k(page), 'the 4K that landed hidden never reached the GPU').toBe(0);
  });
});
