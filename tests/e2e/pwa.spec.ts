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
 * and the app opens without a network, with the last data and a translated «Offline» row over «Showing data from <date>»; the
 * live favicon follows the Moon's phase at the selected instant and the selected site's state; and the production CSP
 * lets all of it run with no violation on every locale.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

/** The map only the desktop layout uses, left out of the install and kept once a desktop page asks (VENT-95). */
const DESKTOP_EXTRAS = ['textures/moon-south-polar-2k.jpg'];
/** Past the page's start (src/lib/after-start.ts waits 2 s at most), when a desktop page asks for its extras. */
const START_WAIT_MS = 3000;

/** The paths under the base the context's service workers ask the network for, as they are asked. */
function workerAsks(context: BrowserContext): string[] {
  const asked: string[] = [];
  context.on('request', (request) => {
    if (request.serviceWorker()) asked.push(new URL(request.url()).pathname.slice(base.length));
  });
  return asked;
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
  for (const [path, lang, title, since] of [
    ['', 'en', 'Offline', /^Showing data from \d{1,2} \w+ \d{4}$/],
    ['es/', 'es', 'Sin conexión', /^Mostrando datos del \d{1,2} de \w+ de \d{4}$/],
    ['de/', 'de', 'Offline', /^Zeigt Daten vom \d{1,2}\. \w+ \d{4}$/],
  ] as const) {
    test(`/${path} opens without a network, with the last data and the ${lang} notice`, async ({ context, page }) => {
      const map = await offlineVisit(context, page, path);
      // The map the visit used comes from the worker's cache.
      expect(map.fromServiceWorker()).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      const status = page.locator('.offline-notice').getByRole('status');
      await expect(status.locator('.notice-row__title')).toHaveText(title);
      await expect(status.locator('.notice-row__how')).toHaveText(since);
      await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
      await page.screenshot({ path: test.info().outputPath(`offline-${lang}.png`) });
      await context.setOffline(false);
      await expect(page.locator('.offline-notice')).toBeEmpty();
    });
  }
});

test.describe('what the worker downloads', () => {
  test('the install keeps the offline set: pages, icons, every phase frame and thumbnail, the 1K maps, the 2K relief', async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const asked = workerAsks(context);
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
        'textures/moon-lola-normal-1k.jpg',
        'textures/moon-lola-normal-2k.jpg',
      ]),
    );
    // The 2K relief is fetched by the phone's install (VENT-97: its globe climbs to 2K after opening). The 2K colour
    // is not (VENT-101): it comes as KTX2 where the GPU takes it, with its transcoder, and is kept when the page uses it.
    expect(asked).toEqual(expect.arrayContaining(['textures/moon-lola-normal-2k.jpg']));
    expect(kept).not.toContain('textures/moon-lroc-2k.jpg');
    // The polar map, the desktop's alone, is neither installed nor asked for once the phone's page has started (VENT-95).
    await page.waitForTimeout(START_WAIT_MS);
    expect(kept.filter((f) => DESKTOP_EXTRAS.includes(f))).toEqual([]);
    expect((await keptFiles(page)).filter((f) => DESKTOP_EXTRAS.includes(f))).toEqual([]);
    expect(asked.filter((f) => DESKTOP_EXTRAS.includes(f))).toEqual([]);
    expect(kept.filter((f) => f.startsWith('en-xa/'))).toEqual([]);
    expect(kept.filter((f) => /^icons\/phase\/moon-\d{2}\.webp$/.test(f))).toHaveLength(30);
    expect(kept.filter((f) => f.startsWith('thumbs/')).length).toBeGreaterThan(0);
    // The sharper maps are kept only when the zoom asks for them.
    expect(kept.filter((f) => /-(4|8)k\.jpg$/.test(f))).toEqual([]);
  });

  test('a phone’s globe opens offline on its 1K map, with no polar map kept (VENT-95)', async ({ context, page }) => {
    const map = await offlineVisit(context, page, '');
    expect(map.fromServiceWorker()).toBe(true);
    expect(new URL(map.url()).pathname).toBe(`${base}textures/moon-lroc-1k.jpg`);
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    expect((await keptFiles(page)).filter((f) => DESKTOP_EXTRAS.includes(f))).toEqual([]);
  });

  test('a desktop’s first visit ends with its polar map kept, and offline its 2K globe and polar map still show (VENT-95)', async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // The high tier opens on the 2K maps; software GL would start low (src/lib/quality.ts).
    await open(context, page, '?quality=high');
    await controlled(page);
    await expect.poll(async () => (await keptFiles(page)).filter((f) => DESKTOP_EXTRAS.includes(f)).toSorted(), {
      timeout: 15_000,
    }).toEqual(DESKTOP_EXTRAS.toSorted());
    // As offlineVisit does: a second visit through the worker keeps the API's answers before the network goes.
    await page.reload();
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    await context.setOffline(true);
    // The 2K colour comes as KTX2 where the GPU takes it (VENT-101; SwiftShader: BC1), kept on the first visit's use.
    const globeMap = page.waitForResponse(/\/textures\/moon-lroc-2k\.ktx2$/);
    await page.reload();
    expect((await globeMap).fromServiceWorker()).toBe(true);
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    const polarMap = page.waitForResponse(/\/textures\/moon-south-polar-2k\.jpg$/);
    await page.goto('./?quality=high#polar-map');
    const polar = await polarMap;
    expect(polar.fromServiceWorker()).toBe(true);
    expect(polar.ok()).toBe(true);
    await expect.poll(() => page.locator('.polar__image').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2048);
    await page.screenshot({ path: test.info().outputPath('offline-polar-1440.png') });
  });

  test('after a visit, offline, the 2K KTX2, its transcoder and its worker come from the cache, the worker with its own CSP (VENT-101)', async ({
    context,
    page,
  }) => {
    const workerPolicy = /Content-Security-Policy "([^"]+)"/.exec(
      readFileSync(new URL('../../nginx-basis-worker-headers.conf', import.meta.url), 'utf8'),
    )![1]!;
    // As nginx sends it: the worker's response carries its own policy, which the kept copy must keep.
    await context.route(/\/_astro\/basis-worker[.-][^/]*\.js$/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': workerPolicy } });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(context, page, '?quality=high&debug');
    await controlled(page);
    await page.reload();
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    await expect.poll(async () => (await keptFiles(page)).filter((f) => /moon-lroc-2k\.ktx2$|basis/.test(f)).length, {
      timeout: 15_000,
    }).toBe(4);
    const keptPolicy = await page.evaluate(async () => {
      const names = (await caches.keys()).filter((n) => n.startsWith('ventana-static-'));
      for (const name of names) {
        const keys = await (await caches.open(name)).keys();
        const worker = keys.find((r) => /\/_astro\/basis-worker[.-]/.test(r.url));
        if (worker) return (await caches.match(worker))?.headers.get('content-security-policy') ?? null;
      }
      return null;
    });
    expect(keptPolicy).toBe(workerPolicy);
    // Only the offline visit's lines.
    await page.evaluate(() => localStorage.removeItem('ventana.devtools.breadcrumbs'));
    await context.setOffline(true);
    const asked: string[] = [];
    page.on('request', (request) => asked.push(new URL(request.url()).pathname));
    const map = page.waitForResponse(/\/textures\/moon-lroc-2k\.ktx2$/);
    await page.reload();
    expect((await map).fromServiceWorker()).toBe(true);
    const lines = () =>
      page.evaluate(() => (JSON.parse(localStorage.getItem('ventana.devtools.breadcrumbs') ?? '[]') as string[]).join('\n'));
    await expect.poll(lines, { timeout: 30_000 }).toMatch(/globe: 2K colour as KTX2 → BC1[\s\S]*globe: 2K on the Moon/);
    expect(await lines()).not.toMatch(/KTX2 off/);
    expect(asked).not.toContain(`${base}textures/moon-lroc-2k.jpg`);
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
    await expect(notice.locator('.notice-row__title')).toHaveText('Offline');
    await expect(notice.locator('.notice-row__how')).toHaveText(/^Showing data from/);
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    await expect.poll(async () => (await box('.offline-notice')).y >= (await box('.phone-bar')).y + (await box('.phone-bar')).height).toBe(true);
    const pill = await box('.site-pill');
    const note = await box('.offline-notice');
    const apart = note.y >= pill.y + pill.height || note.x >= pill.x + pill.width || note.x + note.width <= pill.x;
    expect(apart).toBe(true);
    // Two lines at most, so it covers little of the globe: «Offline» on one, the date cut on the other (VENT-57).
    for (const line of [notice.locator('.notice-row__title'), notice.locator('.notice-row__how')]) {
      const [height, lineHeight] = await line.evaluate((el) => [el.getBoundingClientRect().height, parseFloat(getComputedStyle(el).lineHeight)]);
      expect(Math.round(height / lineHeight)).toBe(1);
    }
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

/** The update row's three parts. */
const updateRow = (page: Page) => ({
  text: page.locator('.update-notice__live'),
  update: page.getByRole('button', { name: 'New version ready: update now' }),
  dismiss: page.getByRole('button', { name: 'Not now' }),
});

/**
 * A deploy as the open page sees it: a new worker installs with `skipWaiting`, activates with `clients.claim` and takes
 * the page over. Playwright cannot answer the browser's own update fetch of `sw.js` (neither `route` nor a CDP `Fetch`
 * sees it), so the new worker comes from the same script under another URL, which the browser installs as a new
 * version whatever its bytes. The check on the return to the foreground is held by tests/pwa-update.test.ts.
 */
async function deployNewVersion(page: Page): Promise<void> {
  await page.evaluate(async (root) => {
    await navigator.serviceWorker.register(`${root}sw.js?build=next`, { scope: root });
  }, base);
}

/** Opens IM-2 on the DSN view, lets the first worker take the page over, and checks that offered nothing. */
async function firstInstall(context: BrowserContext, page: Page): Promise<void> {
  await open(context, page, '?site=im2-athena#dsn');
  await controlled(page);
  await expect(updateRow(page).update).toHaveCount(0);
  await expect(updateRow(page).text).toBeEmpty();
}

test.describe('a new version (VENT-52)', () => {
  test('390x844: «Update» reloads the same address', async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await firstInstall(context, page);
    const before = page.url();
    await deployNewVersion(page);
    const row = updateRow(page);
    await expect(row.text).toHaveText('New version ready');
    // The whole row is the update: the mark, «New version ready» and how to update (the mouse's line on this page).
    await expect(row.update).toContainText('New version ready');
    await expect(row.update.locator('.pin-hint__fine')).toHaveText('Click to update');
    await expect(row.update.locator('.pin-hint__coarse')).toBeHidden();
    for (const button of [row.update, row.dismiss]) {
      const box = (await button.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
    const bar = (await page.locator('.phone-bar').boundingBox())!;
    expect((await page.locator('.update-notice').boundingBox())!.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    await Promise.all([page.waitForEvent('load'), row.update.click()]);
    expect(page.url()).toBe(before);
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  for (const [name, size, scheme] of [
    ['390x844 dark', { width: 390, height: 844 }, 'dark'],
    ['390x844 light', { width: 390, height: 844 }, 'light'],
    ['1440x900 dark', { width: 1440, height: 900 }, 'dark'],
  ] as const) {
    test(`${name}: the ✕ hides it`, async ({ context, page }) => {
      await page.setViewportSize(size);
      await firstInstall(context, page);
      await page.emulateMedia({ colorScheme: scheme });
      await deployNewVersion(page);
      const row = updateRow(page);
      await expect(row.update).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`update-${size.width}-${scheme}.png`) });
      // It leaves as it came (VENT-82): two frames after the ✕ the row is still there, `out` and fading, its room kept.
      const leaving = await page.evaluate(async () => {
        const notice = document.querySelector<HTMLElement>('.update-notice')!;
        notice.querySelector<HTMLElement>('.pin-hint__close')!.click();
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        return {
          presence: notice.dataset.presence,
          buttons: notice.querySelectorAll('button').length,
          fading: notice.getAnimations().some((run) => (run as CSSTransition).transitionProperty === 'opacity'),
          room: document.documentElement.style.getPropertyValue('--update-row-space'),
        };
      });
      expect(leaving.presence).toBe('out');
      expect(leaving.buttons).toBe(2);
      expect(leaving.fading).toBe(true);
      expect(leaving.room).not.toBe('');
      await expect(row.update).toHaveCount(0);
      await expect(page.locator('.update-notice')).toHaveAttribute('data-presence', 'out');
      await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--update-row-space')))
        .toBe('');
      await expect(row.text).toBeEmpty();
    });
  }
});

/** Whether two boxes share any pixel. */
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe('the update row on the phone’s globe (VENT-52)', () => {
  test('390x844: the row, then the pin hint, then the compass, none over another', async ({ context, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(context, page, '?site=im2-athena');
    await controlled(page);
    const compass = page.locator('.compass');
    await expect(page.locator('.pin-hint')).toBeVisible();
    await deployNewVersion(page);
    await expect(updateRow(page).update).toBeVisible();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    await expect
      .poll(async () => (await box('.compass')).y >= (await box('.pin-hint')).y + (await box('.pin-hint')).height)
      .toBe(true);
    const row = await box('.update-notice');
    const hint = await box('.pin-hint');
    expect(hint.y).toBeGreaterThanOrEqual(row.y + row.height);
    expect(overlaps(row, await compass.boundingBox().then((b) => b!))).toBe(false);
    expect(overlaps(hint, await compass.boundingBox().then((b) => b!))).toBe(false);
    await page.screenshot({ path: test.info().outputPath('update-stack-390.png') });
    // Without the hint the compass comes up under the row alone, still clear of it.
    await page.locator('.pin-hint .pin-hint__close').click();
    await expect(page.locator('.pin-hint')).toHaveCount(0);
    await expect.poll(async () => overlaps(await box('.update-notice'), await box('.compass'))).toBe(false);
    await expect.poll(async () => (await box('.compass')).y < hint.y + hint.height).toBe(true);
  });
});

/**
 * A deploy that changed one file (VENT-90): the new worker's install copies every unchanged file from the older build's
 * cache and asks the server only for the changed one, and its activation carries over the 4K map the old one kept on
 * use. The new `sw.js` is the built one with another digest (a new static cache) and another hash for the 1K map, served
 * under another URL (see deployNewVersion).
 */
test.describe('a deploy downloads only what changed (VENT-90)', () => {
  test('the update asks the server for the one changed file, and the new cache holds the whole offline set', async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(context, page, '');
    await controlled(page);
    // The zoom's map, kept on use by the old worker: the activation carries it over, unchanged, without a download.
    await page.evaluate(async (root) => (await fetch(`${root}textures/moon-lroc-4k.jpg`)).arrayBuffer(), base);
    await expect.poll(async () => (await keptFiles(page)).includes('textures/moon-lroc-4k.jpg')).toBe(true);
    const before = (await keptFiles(page)).toSorted();
    await context.route(/\/sw\.js\?build=vent90$/, async (route) => {
      const response = await route.fetch();
      const body = (await response.text())
        .replace(/digest:`[0-9a-f]{12}/, 'digest:`0123456789ab')
        .replace(/("textures\/moon-lroc-1k\.jpg":`)[0-9a-f]{16}/, '$1ffffffffffffffff');
      await route.fulfill({ response, body });
    });
    const asked: string[] = [];
    context.on('request', (request) => {
      if (request.serviceWorker()) asked.push(new URL(request.url()).pathname.slice(base.length));
    });
    await page.evaluate(async (root) => {
      await navigator.serviceWorker.register(`${root}sw.js?build=vent90`, { scope: root });
    }, base);
    await expect
      .poll(() => page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith('ventana-static-'))))
      .toEqual(['ventana-static-0123456789ab']);
    // The worker's own script and the API's answers are not the install's.
    const installed = asked.filter((path) => path !== 'sw.js' && !path.startsWith('api/'));
    expect(installed).toEqual(['textures/moon-lroc-1k.jpg']);
    expect((await keptFiles(page)).toSorted()).toEqual(before);
  });
});
