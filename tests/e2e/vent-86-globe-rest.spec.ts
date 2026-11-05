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
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const MAP_1K = /\/textures\/moon-lroc-1k\.jpg$/;
const MAP_4K = /\/textures\/moon-lroc-4k\.jpg$/;

/** The Moon maps the page has loaded so far, in order. */
const loaded = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { mapLoads: string[] }).mapLoads.filter((url) => /moon-lroc-/.test(url)));

/** Records every image `src` the page sets. */
function recordImageLoads(): void {
  const loads: string[] = [];
  (window as unknown as { mapLoads: string[] }).mapLoads = loads;
  const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    ...src,
    set(this: HTMLImageElement, url: string) {
      loads.push(url);
      src?.set?.call(this, url);
    },
  });
}

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Views' });

/** Zooms in with the keyboard until the 4K map is asked for. */
async function zoomTo4k(page: Page): Promise<void> {
  const map4k = page.waitForResponse(MAP_4K);
  await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
  for (let step = 0; step < 4; step++) await page.keyboard.press('+');
  expect((await map4k).ok()).toBe(true);
}

test.describe('globe maps while the globe is hidden, phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('hidden, the globe goes back to its start map; shown, it climbs to 4K again', async ({ page }) => {
    await page.addInitScript(recordImageLoads);
    await stubApi(page);
    const start = page.waitForResponse(MAP_1K);
    await page.goto('./?quality=medium');
    await start;
    await zoomTo4k(page);
    const before = (await loaded(page)).length;
    const since = async (): Promise<string[]> => (await loaded(page)).slice(before);
    await tabs(page).getByRole('button', { name: 'DSN', exact: true }).click();
    await expect.poll(async () => (await since()).filter((url) => MAP_1K.test(url)).length).toBe(1);
    expect((await since()).filter((url) => MAP_4K.test(url))).toEqual([]);
    await tabs(page).getByRole('button', { name: 'Globe', exact: true }).click();
    await expect.poll(async () => (await since()).filter((url) => MAP_4K.test(url)).length).toBe(1);
  });
});
