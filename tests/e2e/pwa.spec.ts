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
 * The installable app (VENT-28): every locale links its own manifest with the J2 icons; the service worker registers,
 * and the app opens without a network, with the last data and a translated «Offline · data from <date>» notice; the
 * live favicon follows the Moon's phase at the selected instant and the selected site's state; and the production CSP
 * lets all of it run with no violation on every locale.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type BrowserContext, type Page, type Response } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-29T20:00:00Z');
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const base = (process.env.SITE_BASE ?? '/').replace(/\/?$/, '/');
const ROUTES = [
  ['', 'en'],
  ['es/', 'es'],
  ['fr/', 'fr'],
  ['de/', 'de'],
  ['it/', 'it'],
] as const;

test.use({ serviceWorkers: 'allow' });

/** Opens `path` at the fixed instant with the API stubbed for the page and its worker, once IM-2's state shows. */
async function open(context: BrowserContext, page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(context);
  await page.goto(`./${path}`);
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
}

/** Waits until the service worker controls the page. */
async function controlled(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });
}

/** The paths under the base the worker keeps in its static cache. */
function keptFiles(page: Page): Promise<string[]> {
  return page.evaluate(async (root) => {
    const names = (await caches.keys()).filter((n) => n.startsWith('ventana-static-'));
    const lists = await Promise.all(names.map(async (n) => (await caches.open(n)).keys()));
    return lists.flat().map((r) => new URL(r.url).pathname.slice(root.length));
  }, base);
}

/**
 * Opens `path` on a 390 px phone, lets the worker take it over and keep what the visit used, then goes offline and
 * reloads; resolves with the Moon map's answer on that offline load.
 */
async function offlineVisit(context: BrowserContext, page: Page, path: string): Promise<Response> {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(context, page, path);
  await controlled(page);
  // The second visit runs through the worker, which keeps the API's answers and the files the page uses.
  await page.reload();
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
  await expect(page.locator('.offline-notice')).toBeEmpty();
  await expect.poll(async () => (await keptFiles(page)).some((f) => f.startsWith('textures/moon-lroc-'))).toBe(true);
  await context.setOffline(true);
  const map = page.waitForResponse(/\/textures\/moon-lroc-\dk\.jpg$/);
  await page.reload();
  return map;
}

/** The width and height a PNG declares in its header. */
function pngSize(bytes: Buffer): [number, number] {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test.describe('manifests', () => {
  for (const [path, lang] of ROUTES) {
    test(`/${path} links its ${lang} manifest, valid, with the icons`, async ({ page }) => {
      await page.goto(`./${path}`);
      const href = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(href).toBe(`${base}${path}manifest.webmanifest`);
      const response = await page.request.get(new URL(href!, page.url()).href);
      expect(response.headers()['content-type']).toContain('application/manifest+json');
      const manifest = await response.json();
      expect(manifest).toMatchObject({ name: 'Ventana Lunar', lang, start_url: `${base}${path}`, scope: `${base}${path}` });
      expect(manifest.display).toBe('standalone');
      expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(3);
      for (const icon of manifest.icons) {
        const png = await page.request.get(new URL(icon.src, page.url()).href);
        expect(png.headers()['content-type']).toBe('image/png');
        const side = Number(icon.sizes.split('x')[0]);
        expect(pngSize(await png.body())).toEqual([side, side]);
      }
      expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toContain('maskable');
      const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
      expect(pngSize(await (await page.request.get(new URL(touch!, page.url()).href)).body())).toEqual([180, 180]);
      // Some clients ask for it at the root without reading the link.
      const root = await page.request.get(new URL(`${base}apple-touch-icon.png`, page.url()).href);
      expect(root.headers()['content-type']).toBe('image/png');
      expect(pngSize(await root.body())).toEqual([180, 180]);
    });
  }

  test('the pseudo-locale is never installable', async ({ page }) => {
    await page.goto('./en-xa/');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  });

  test('a shortcut’s `?site=` opens that site', async ({ context, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.clock.setFixedTime(NOW);
    await stubApi(context);
    await page.goto('./es/?site=apollo11');
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'none');
    await expect(page.getByRole('button', { name: /^Cambiar de lugar; ahora Apollo 11/ })).toBeVisible();
  });
});

test.describe('offline', () => {
  for (const [path, lang, notice] of [
    ['', 'en', /^Offline · data from \d{1,2} \w+ \d{4}$/],
    ['es/', 'es', /^Sin conexión · datos del \d{1,2} de \w+ de \d{4}$/],
    ['de/', 'de', /^Offline · Daten vom \d{1,2}\. \w+ \d{4}$/],
  ] as const) {
    test(`/${path} opens without a network, with the last data and the ${lang} notice`, async ({ context, page }) => {
      const map = await offlineVisit(context, page, path);
      // The map the visit used comes from the worker's cache.
      expect(map.fromServiceWorker()).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('.offline-notice')).toHaveText(notice);
      await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
      await page.screenshot({ path: test.info().outputPath(`offline-${lang}.png`) });
      await context.setOffline(false);
      await expect(page.locator('.offline-notice')).toBeEmpty();
    });
  }
});

test.describe('what the worker downloads', () => {
  test('the install keeps the offline set: pages, icons, every phase frame and thumbnail, the start maps', async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(context, page, '');
    await controlled(page);
    const kept = await keptFiles(page);
    expect(kept).toEqual(
      expect.arrayContaining([
        '',
        'es/',
        'fr/',
        'de/',
        'it/',
        'manifest.webmanifest',
        'icons/icon-192.png',
        'textures/moon-lroc-1k.jpg',
        'textures/moon-lroc-2k.jpg',
        'textures/moon-lola-normal-1k.jpg',
        'textures/moon-lola-normal-2k.jpg',
        'textures/moon-south-polar-2k.jpg',
      ]),
    );
    expect(kept.filter((f) => f.startsWith('en-xa/'))).toEqual([]);
    expect(kept.filter((f) => /^icons\/phase\/moon-\d{2}\.webp$/.test(f))).toHaveLength(30);
    expect(kept.filter((f) => f.startsWith('thumbs/')).length).toBeGreaterThan(0);
    // The sharper maps are kept only when the zoom asks for them.
    expect(kept.filter((f) => /-(4|8)k\.jpg$/.test(f))).toEqual([]);
  });

  test('under Save-Data no worker is registered', async ({ context, page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    });
    await stubApi(context);
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Load the 3D globe' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  });
});

test.describe('offline notice, 390x844 at 200 % text', () => {
  test('sits under the grown top bar and never over the site pill (QA VENT-28)', async ({ context, page }) => {
    await offlineVisit(context, page, '');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const notice = page.locator('.offline-notice');
    await expect(notice).toHaveText(/^Offline · data from/);
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    await expect.poll(async () => (await box('.offline-notice')).y >= (await box('.phone-bar')).y + (await box('.phone-bar')).height).toBe(true);
    const pill = await box('.site-pill');
    const note = await box('.offline-notice');
    const apart = note.y >= pill.y + pill.height || note.x >= pill.x + pill.width || note.x + note.width <= pill.x;
    expect(apart).toBe(true);
    // Two lines at most, so it covers little of the globe.
    const lineHeight = await notice.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect(note.height).toBeLessThanOrEqual(2 * lineHeight + 20);
    await page.screenshot({ path: test.info().outputPath('offline-200.png') });
  });
});

const favicon = (page: Page) => page.locator('#live-favicon');

/** The live favicon's address, once it has drawn. */
async function drawnFavicon(page: Page): Promise<string> {
  await expect(favicon(page)).toHaveAttribute('href', /^data:image\/png;base64,/);
  return (await favicon(page).getAttribute('href'))!;
}

test.describe('live favicon, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('follows the Moon’s phase when the instant moves across the month', async ({ context, page }) => {
    await open(context, page, '');
    const first = await drawnFavicon(page);
    const strip = page.getByRole('region', { name: 'Calendar' });
    const track = await strip.getByRole('slider', { name: 'Selected hour' }).boundingBox();
    if (!track) throw new Error('no slider');
    await page.mouse.click(track.x + 4, track.y + track.height / 2);
    await expect(favicon(page)).not.toHaveAttribute('href', first);
    const early = await drawnFavicon(page);
    await page.mouse.click(track.x + track.width - 4, track.y + track.height / 2);
    await expect(favicon(page)).not.toHaveAttribute('href', early);
  });

  test('emphasises the selected site’s state: a window, then nothing', async ({ context, page }) => {
    await open(context, page, '');
    const window = await drawnFavicon(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('Apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'none');
    await expect(favicon(page)).not.toHaveAttribute('href', window);
  });
});

/** The CSP nginx sends for the built site (packages/web/scripts/csp-header.mjs, as the Dockerfile runs it). */
function builtPolicy(): string {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  return /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
}

test.describe('the production CSP with the worker and the live favicon', () => {
  for (const [path, lang] of ROUTES) {
    test(`/${path}: no violation`, async ({ context, page }) => {
      const policy = builtPolicy();
      await context.route(/\/(\?.*)?(#.*)?$/, async (route) => {
        const response = await route.fetch();
        await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
      });
      await page.addInitScript(() => {
        const seen: string[] = [];
        (window as unknown as { violations: string[] }).violations = seen;
        document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.violatedDirective} ${e.blockedURI}`));
      });
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(context, page, path);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await controlled(page);
      await drawnFavicon(page);
      expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
    });
  }
});
