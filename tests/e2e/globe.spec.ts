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

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

// The real site list, as the API serves it (`{ sites }`), for the runs that stub the API.
const SITES = JSON.parse(readFileSync(new URL('../../packages/server/data/sites.json', import.meta.url), 'utf8')) as {
  name: string;
  lat: number;
  lonEast: number;
  approximate: boolean;
}[];
// Sites that share a point share one marker, which is a zone only when all of them are zones.
const POINTS = new Map<string, typeof SITES>();
for (const site of SITES) POINTS.set(`${site.lat},${site.lonEast}`, [...(POINTS.get(`${site.lat},${site.lonEast}`) ?? []), site]);
const ZONE_POINTS = [...POINTS.values()].filter((group) => group.every((s) => s.approximate));
const IM1 = '[data-site-id="im1-odysseus"]';
const IM2 = '[data-site-id="im2-athena"]';
// A merged zone (Griffin-1 and Nobile Rims 1 and 2) whose ring falls inside IM-2's hit box at the opening view.
const NOBILE = '[data-site-id="griffin1-nobile"]';
// Requests only the globe makes: its chunk (Three.js inside) and the Moon texture.
const GLOBE_ASSET = /\/_astro\/globe\.[^/]*\.js$|\/textures\/moon-lroc-/;
// Chromium's own line for a failed request; the page cannot silence it, so the unreachable-API test allows it.
const NETWORK_LINE = /^Failed to load resource/;

/** The centre of a marker's box, where its dot is drawn, in page px, once the globe has stopped turning. */
async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const read = () => page.locator(selector).evaluate((el) => (el as HTMLElement).style.transform);
  let last = await read();
  await expect
    .poll(async () => {
      await page.waitForTimeout(150);
      const now = await read();
      const still = now === last && now !== '';
      last = now;
      return still;
    })
    .toBe(true);
  const box = await page.locator(selector).boundingBox();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

/** The site whose button is on top at `at`: the one the browser hit-tests, before any routing. */
function siteUnder(page: Page, at: { x: number; y: number }): Promise<string | undefined> {
  return page.evaluate(({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.dataset['siteId'], at);
}

function collectConsole(page: Page): { errors: string[]; warnings: string[] } {
  const log = { errors: [] as string[], warnings: [] as string[] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') log.errors.push(m.text());
    if (m.type() === 'warning') log.warnings.push(m.text());
  });
  return log;
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('draws the globe with the API sites and logs no errors', async ({ page }) => {
    await stubApi(page);
    const log = collectConsole(page);
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('./');
    const globe = page.getByRole('region', { name: 'Lunar globe' });
    await expect(globe.locator('canvas')).toHaveCount(1);
    await expect(globe.locator('.globe-marker')).toHaveCount(POINTS.size);
    await expect(globe.locator('.globe-marker--zone')).toHaveCount(ZONE_POINTS.length);
    await expect(globe.locator('.globe-label')).toHaveText('Mons Mouton (IM-2 Athena)');
    await expect(globe.locator('.globe-label')).toBeVisible();
    expect(log.errors).toEqual([]);
    // The phone Save-Data test (phone.spec.ts) looks for these same requests: here they must happen.
    expect(requested.filter((url) => GLOBE_ASSET.test(url))).toHaveLength(2);
  });

  test('still draws without the API: no markers and one clear warning', async ({ page }) => {
    const log = collectConsole(page);
    const sites = page.waitForResponse('**/api/v1/sites');
    await page.goto('./');
    const globe = page.getByRole('region', { name: 'Lunar globe' });
    await expect(globe.locator('canvas')).toHaveCount(1);
    await sites;
    await expect.poll(() => log.warnings.filter((w) => w.includes('no landing sites')).length).toBe(1);
    await expect(globe.locator('.globe-marker')).toHaveCount(0);
    expect(log.errors.filter((e) => !NETWORK_LINE.test(e))).toEqual([]);
  });

  test('selecting a site names it in the label, which sits on its marker', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stubApi(page);
    await page.goto('./');
    await expect(page.locator(IM1)).toHaveAttribute('style', /translate3d/);
    const at = await centreOf(page, IM1);
    await page.mouse.click(at.x, at.y);
    await expect(page.locator('.globe-label')).toHaveText('Malapert A region (IM-1 Odysseus)');
    const transform = (selector: string) => page.locator(selector).evaluate((el) => (el as HTMLElement).style.transform);
    // The globe turns to the picked site: compare where both are now, frame after frame.
    await expect.poll(async () => (await transform('.globe-label')) === (await transform(IM1))).toBe(true);
    expect(await transform('.globe-label')).toMatch(/^translate3d\(/);
  });

  test('at the opening zoom a mouse click on either close dot selects that dot, whichever box is on top', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stubApi(page);
    await page.goto('./');
    await expect(page.locator(IM1)).toHaveAttribute('style', /translate3d/);
    // Under the calendar strip the opening globe is small: IM-1 and IM-2 sit closer than a 44 px box, so the box of
    // the selected IM-2 (stacked on top) covers IM-1's dot. The click still goes to the dot nearest the pointer.
    const im1 = await centreOf(page, IM1);
    expect(await siteUnder(page, im1)).toBe('im2-athena');
    await page.mouse.click(im1.x, im1.y);
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(IM2)).toHaveAttribute('aria-pressed', 'false');
    // Now IM-1 is selected and on top, and its box covers IM-2's dot: the click on IM-2 still selects IM-2.
    const im2 = await centreOf(page, IM2);
    expect(await siteUnder(page, im2)).toBe('im1-odysseus');
    await page.mouse.click(im2.x, im2.y);
    await expect(page.locator(IM2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.globe-label')).toHaveText('Mons Mouton (IM-2 Athena)');
  });

  test('the keyboard selects a marker whose dot another box covers', async ({ page }) => {
    await stubApi(page);
    await page.goto('./');
    await page.getByRole('button', { name: /Malapert A region \(IM-1 Odysseus\)/ }).press('Enter');
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a zone ring under another marker stays in the DOM, hidden, and shows on zoom', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stubApi(page);
    await page.goto('./');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/);
    await expect(page.locator(NOBILE)).toHaveCount(1);
    await expect(page.locator(NOBILE)).toBeHidden();
    await expect(page.locator('.globe-marker')).toHaveCount(POINTS.size);
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 6; press += 1) await page.keyboard.press('+');
    await expect(page.locator(NOBILE)).toBeVisible();
  });

  test('a marker is a 44 px touch target around the same small dot', async ({ page }) => {
    await stubApi(page);
    await page.goto('./');
    await page.getByRole('button', { name: /Malapert A region \(IM-1 Odysseus\)/ }).press('Enter');
    const marker = page.locator(IM2);
    await expect(marker).toHaveAttribute('aria-pressed', 'false');
    const box = await marker.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    // The hit area grew; the dot is still 8 px.
    const dot = await marker.evaluate((el) => getComputedStyle(el, '::after').width);
    expect(dot).toBe('8px');
  });

  test('the viewport is focusable and turns with the arrow keys', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stubApi(page);
    await page.goto('./');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/);
    const before = await page.locator(IM2).evaluate((el) => (el as HTMLElement).style.transform);
    const viewport = page.getByRole('application', { name: 'The Moon, seen over its south pole' });
    await expect(viewport).toHaveAttribute('aria-describedby', 'globe-help');
    await expect(page.locator('#globe-help')).toContainText('Lit by the Sun as of');
    await viewport.focus();
    await page.keyboard.press('ArrowRight');
    await expect(viewport).toBeFocused();
    // Under reduced motion the turn lands at once: the next frame moves the marker.
    await expect.poll(() => page.locator(IM2).evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before);
  });

  test('renders no phone shell', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('section.globe')).toBeVisible();
    await expect(page.locator('.phone')).toHaveCount(0);
    await expect(page.locator('.sheet')).toHaveCount(0);
  });
});

test.describe('desktop texture detail, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  // Headless Chromium draws with SwiftShader, which the tier detection rates low (stops at 4K): force the high tier a
  // desktop GPU gets.
  const HIGH = './?quality=high';
  const MAP_4K = /\/textures\/moon-lroc-4k\.jpg$/;
  const MAP_8K = /\/textures\/moon-lroc-8k\.jpg$/;

  /** Two zoom steps from the opening view (5 Moon radii) reach 3.2 radii: past the 4K threshold, short of 8K. */
  async function zoomToMedium(page: Page): Promise<void> {
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    await page.keyboard.press('+');
    await page.keyboard.press('+');
  }

  test('zooming in fetches the 4K map and its relief, and logs no errors', async ({ page }) => {
    await stubApi(page);
    const log = collectConsole(page);
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    const start = page.waitForResponse(/\/textures\/moon-lola-normal-2k\.jpg$/);
    await page.goto(HIGH);
    await start;
    expect(requested.filter((url) => MAP_4K.test(url))).toEqual([]);
    const map4k = page.waitForResponse(MAP_4K);
    const relief4k = page.waitForResponse(/\/textures\/moon-lola-normal-4k\.jpg$/);
    await zoomToMedium(page);
    expect((await map4k).ok()).toBe(true);
    expect((await relief4k).ok()).toBe(true);
    expect(requested.filter((url) => MAP_8K.test(url))).toEqual([]);
    expect(log.errors).toEqual([]);
  });

  test('under Save-Data, zooming in never fetches more than the start map', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    await stubApi(page);
    const log = collectConsole(page);
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto(HIGH);
    const start = page.waitForResponse(/\/textures\/moon-lroc-2k\.jpg$/);
    await page.getByRole('button', { name: 'Load the 3D globe' }).click();
    await start;
    await zoomToMedium(page);
    for (let press = 0; press < 6; press += 1) await page.keyboard.press('+');
    await page.waitForLoadState('networkidle');
    expect(requested.filter((url) => MAP_4K.test(url) || MAP_8K.test(url) || /normal-4k/.test(url))).toEqual([]);
    expect(log.errors).toEqual([]);
  });
});
