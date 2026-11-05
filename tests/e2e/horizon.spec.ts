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
 * The real terrain horizon in the interface (VENT-40, canvas option B). Where the terrain decides, the tiles say so in
 * honest words: IM-2 on 30 November 2026 at 20:00 UTC keeps the Sun 0.05° under the level, seen over the ridge; at
 * Haworth on 22 November 2026 at 20:00 UTC the Earth stands 8.5° up behind the terrain, and the DSN block says that is
 * why there is no link. The horizon strip draws the site's LOLA skyline with north in the centre, the Sun and the Earth
 * at the shared instant, and says where the horizon comes from. A dropped pin shows the smooth horizon until the API
 * answers its terrain, and keeps it, quietly, when the API has none. On phones the half sheet rises until its content
 * clears the tab bar by 12 px, at 360 and 390 px, in Spanish and at 200 % text.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi, type HorizonStub } from './api-stub';

const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-11-02';
const RIDGE = new Date('2026-11-30T20:00:00Z');
const CANVAS = new Date('2026-11-22T20:00:00Z');
const LOLA_20 = 'LOLA terrain (NASA LRO), 20 m';
// The pin's point, near Nobile Rim 1: the stub's wall hides its Earth (api-stub.ts, STUB_WALL).
const PIN = '?lat=-85.50&lon=40.00';
// The server's final answer for a point outside its terrain (VENT-45: a 503 is a passing failure, asked again).
const NO_TERRAIN = { status: 404, error: 'no terrain data covers this point' } as const;

interface Open {
  readonly at: Date;
  readonly path?: string;
  readonly horizon?: HorizonStub;
  /** The sites saved on this device (src/saved/saved-schema.ts). */
  readonly saved?: readonly object[];
}

/** Opens `path` at `at` on the computed sky, as if chosen on an earlier visit. */
async function open(page: Page, { at, path = './', horizon, saved }: Open): Promise<void> {
  await page.clock.setFixedTime(at);
  await page.addInitScript((kept) => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    if (kept) localStorage.setItem('ventana.savedSites', kept);
  }, saved ? JSON.stringify({ v: 1, sites: saved }) : null);
  await stubApi(page, { horizon });
  await page.goto(path);
}

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: new URL(`${DATE}-vent-40-${name}.png`, OUT).pathname });
}

const card = (page: Page) => page.getByRole('complementary', { name: 'Site card' });
const tile = (page: Page, label: RegExp) =>
  card(page).locator('.card-tile').filter({ has: page.locator('.card-tile__label', { hasText: label }) });
const strip = (page: Page) => page.getByRole('region', { name: 'Horizon' });
const picture = (page: Page) => strip(page).getByRole('img');

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('IM-2 on the ridge: the Sun under the level, over the ridge, and the strip of its LOLA terrain', async ({ page }) => {
    await open(page, { at: RIDGE, path: './?site=im2-athena' });
    await expect(tile(page, /^Sunset in/)).toHaveText('Sunset in1 hSun 0.1° below levelOver the ridge');
    await expect(tile(page, /^Earthset in/)).not.toContainText('terrain');
    await expect(strip(page)).toContainText(LOLA_20);
    await expect(strip(page)).toContainText(/Height ×\d+/);
    await expect(strip(page).locator('.horizon__compass')).toHaveText('SWNES');
    await expect(picture(page)).toHaveAccessibleName(
      'The horizon all around the site, north in the centre. The Sun is to the west, above the terrain. ' +
        'The Earth is to the north-west, above the terrain.',
    );
    await expect(strip(page).locator('.horizon__skyline')).toHaveCount(1);
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun', 'Earth']);
    await expect(card(page).getByText(/Sun and Earth over the terrain, Earth 3° up$/)).toBeVisible();
    await expect(card(page).getByText(/Sun above 0°/)).toHaveCount(0);
    await evidence(page, 'desktop-im2-ridge');
  });

  test('the strip follows the shared instant: a day earlier the Sun is 6.7° up in the north', async ({ page }) => {
    await open(page, { at: CANVAS, path: './?site=im2-athena' });
    await expect(tile(page, /^Sunset in/)).toContainText('Sun 6.7° up');
    await expect(picture(page)).toHaveAccessibleName(/The Sun is to the north, above the terrain\./);
  });

  test('Haworth: the Earth 8.5° up behind the terrain, both bodies hidden on the strip, and the DSN says why', async ({ page }) => {
    await open(page, { at: CANVAS, path: './?site=artemis-haworth' });
    await expect(tile(page, /^Earthrise in/)).toContainText('Earth 8.5° upBehind the terrain');
    await expect(card(page).getByText('Behind the crater rim')).toHaveCount(0);
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun · hidden', 'Earth · hidden']);
    await expect(strip(page).locator('.horizon__body[data-hidden="true"]')).toHaveCount(2);
    await expect(picture(page)).toHaveAccessibleName(
      /The Sun is to the north-east, hidden by the terrain\. The Earth is to the north, hidden by the terrain\.$/,
    );
    const listening = card(page).locator('.dsn-block');
    await expect(listening).toContainText('No link');
    await expect(listening).toContainText('Behind the terrain');
    await expect(listening).not.toContainText('Earth below the horizon');
    await evidence(page, 'desktop-haworth');
  });

  test('a site north of 80° S has no terrain shipped: the smooth horizon, said plainly', async ({ page }) => {
    await open(page, { at: CANVAS, path: './?site=apollo11' });
    await expect(strip(page)).toContainText('Smooth horizon');
    await expect(strip(page)).not.toContainText('Height');
    await expect(strip(page).locator('.horizon__skyline')).toHaveCount(0);
    await expect(card(page).getByText(/Sun above 0°, Earth above 3°$/)).toBeVisible();
  });

  test('a pin: the smooth horizon while the terrain loads, then the terrain, which hides its Earth', async ({ page }) => {
    let answer = (): void => undefined;
    const hold = new Promise<void>((resolve) => (answer = resolve));
    await open(page, { at: CANVAS, path: `./${PIN}`, horizon: { hold } });
    await expect(strip(page)).toContainText('Smooth horizon · real terrain loading');
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun', 'Earth']);
    await expect(tile(page, /^Earthset in/)).toContainText('Earth 9.1° up');
    await evidence(page, 'desktop-pin-loading');
    answer();
    await expect(strip(page)).toContainText(LOLA_20);
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun', 'Earth · hidden']);
    await expect(tile(page, /^Earthrise in/)).toContainText('Earth 9.1° upBehind the terrain');
    await expect(card(page).locator('.dsn-block')).toContainText('Behind the terrain');
    await evidence(page, 'desktop-pin-terrain');
  });

  test('a pin the API has no terrain for keeps the smooth horizon, with a quiet note', async ({ page }) => {
    await open(page, { at: CANVAS, path: `./${PIN}`, horizon: NO_TERRAIN });
    await expect(strip(page)).toContainText('Real terrain unavailable here');
    await expect(strip(page)).toContainText('Smooth horizon');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(tile(page, /^Earthset in/)).toContainText('Earth 9.1° up');
  });

  test('a busy server once, then the terrain: the strip ends on the real terrain without a reload (VENT-45)', async ({ page }) => {
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/horizon?')) asked.push(request.url());
    });
    const failOnce = { status: 503, error: 'the service is busy; try again later', retryAfterSec: 1 };
    await open(page, { at: CANVAS, path: `./${PIN}`, horizon: { failOnce } });
    await expect(strip(page)).toContainText('Smooth horizon · real terrain loading');
    await expect(strip(page)).toContainText(LOLA_20);
    await expect(strip(page)).not.toContainText('Real terrain unavailable here');
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun', 'Earth · hidden']);
    expect(asked).toHaveLength(2);
  });

  test('a pin the API has no terrain for asks once: a 404 is final (VENT-45)', async ({ page }) => {
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/horizon?')) asked.push(request.url());
    });
    await open(page, { at: CANVAS, path: `./${PIN}`, horizon: NO_TERRAIN });
    await expect(strip(page)).toContainText('Real terrain unavailable here');
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(500);
    expect(asked).toHaveLength(1);
  });

  test('a server whose terrain is not installed yet says so, not «unavailable here» (VENT-43)', async ({ page }) => {
    await open(page, { at: CANVAS, path: `./${PIN}`, horizon: { status: 503, error: 'terrain data is not installed' } });
    await expect(strip(page)).toContainText('Real terrain not installed on the server yet');
    await expect(strip(page)).not.toContainText('Real terrain unavailable here');
    await expect(strip(page)).toContainText('Smooth horizon');
  });
});

test.describe('desktop, 1440x900, the saved sites over their terrain (VENT-44)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // The pin's point, where the stub's wall hides the Earth, and a second point the server is never asked about at once.
  const SAVED = [
    { id: '@-85.50,40.00', name: 'Wall camp', lat: -85.5, lonEast: 40, savedAt: 2 },
    { id: '@-84.20,-40.00', name: 'Cabeus ridge', lat: -84.2, lonEast: -40, savedAt: 1 },
  ];

  test('a saved row reads the smooth sphere until its terrain comes, then the terrain; one request at a time', async ({ page }) => {
    let answer = (): void => undefined;
    const hold = new Promise<void>((resolve) => (answer = resolve));
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/horizon?')) asked.push(new URL(request.url()).search);
    });
    await open(page, { at: CANVAS, path: './?site=im2-athena', horizon: { hold }, saved: SAVED });
    await page.locator('.site-button').click();
    const popover = page.locator('#site-popover');
    await popover.getByRole('button', { name: /^Saved/ }).click();
    const row = popover.locator('[data-saved-id="@-85.50,40.00"]');
    await expect(row).toContainText('Window');
    await expect.poll(() => asked.length).toBe(1);
    await page.waitForTimeout(500);
    expect(asked).toEqual(['?lat=-85.50&lon=40.00']);
    answer();
    await expect(row).toContainText('Sun only');
    await expect(row.locator('.signal-dot')).toHaveAttribute('data-state', 'sun');
    await expect.poll(() => asked.length).toBe(2);
    expect(asked[1]).toBe('?lat=-84.20&lon=-40.00');
  });

  test('a saved row whose terrain the server cannot give keeps the smooth sphere', async ({ page }) => {
    // Waited for before anything opens: the queue asks -84.20 once Saved opens and can answer before a wait set after.
    const queued = page.waitForResponse(/\/api\/v1\/horizon\?lat=-84\.20/);
    await open(page, { at: CANVAS, path: './?site=im2-athena', horizon: NO_TERRAIN, saved: SAVED });
    await page.locator('.site-button').click();
    const popover = page.locator('#site-popover');
    await popover.getByRole('button', { name: /^Saved/ }).click();
    await queued;
    await expect(popover.locator('[data-saved-id="@-85.50,40.00"]')).toContainText('Window');
  });
});

const sheet = (page: Page) => page.locator('.sheet');
const tabBar = (page: Page) => page.getByRole('navigation').last();

/** Once the sheet rests: how far the content's lowest line is above the tab bar, and how much the sheet shows. */
async function fit(page: Page): Promise<{ gap: number; shown: number }> {
  await expect(page.getByRole('list').filter({ has: page.locator('.widget') }).first()).toBeVisible();
  await page.waitForTimeout(900);
  // Under CPU load the sheet's spring can outlast any fixed wait: read it once it has stopped (sheet-mount.ts).
  await expect(sheet(page)).not.toHaveAttribute('data-moving', { timeout: 30_000 });
  const tabsTop = (await tabBar(page).boundingBox())!.y;
  const bottom = await sheet(page)
    .locator('[data-sheet-fit]')
    .evaluate((el) => Math.max(...[...el.children].map((c) => c.getBoundingClientRect()).filter((b) => b.height > 0).map((b) => b.bottom)));
  const top = (await sheet(page).boundingBox())!.y;
  return { gap: tabsTop - bottom, shown: page.viewportSize()!.height - top };
}

for (const width of [360, 390]) {
  test.describe(`phone, ${width}x844`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });

    for (const [name, path] of [
      ['haworth', './?site=artemis-haworth'],
      ['im2', './?site=im2-athena'],
      ['es-haworth', './es/?site=artemis-haworth'],
    ] as const) {
      test(`${name}: the half sheet rises until its content clears the tab bar by 12 px`, async ({ page }) => {
        await open(page, { at: CANVAS, path });
        const { gap, shown } = await fit(page);
        expect(shown).toBeGreaterThan(344);
        expect(gap).toBeGreaterThanOrEqual(11.5);
        expect(gap).toBeLessThanOrEqual(13.5);
        await evidence(page, `phone-${width}-${name}`);
      });
    }

    test('at 200 % text the sheet still fits its content over the tab bar, or rests at full', async ({ page }) => {
      await open(page, { at: CANVAS, path: './?site=artemis-haworth' });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      const { gap } = await fit(page);
      const top = (await sheet(page).boundingBox())!.y;
      const barBottom = (await page.locator('.phone-bar').boundingBox())!;
      // Either the content clears the tab bar, or the sheet went as high as it goes (under the top bar).
      expect(gap >= 11.5 || top <= barBottom.y + barBottom.height + 13).toBe(true);
      await evidence(page, `phone-${width}-haworth-200-text`);
    });
  });
}

test.describe('phone, 390x844, the horizon in the sheet', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Haworth: the strip, the Earth behind the terrain, and the DSN widget says why', async ({ page }) => {
    await open(page, { at: CANVAS, path: './?site=artemis-haworth' });
    await expect(strip(page)).toContainText(LOLA_20);
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun · hidden', 'Earth · hidden']);
    const widgets = page.getByRole('list', { name: 'This site now' }).getByRole('listitem');
    await expect(widgets.nth(2)).toContainText('Earth 8.5° upBehind the terrain');
    await expect(widgets.nth(3)).toContainText('Behind the terrain');
    await expect(widgets.nth(3)).not.toContainText('Earth below the horizon');
  });

  test('a pin: the smooth horizon first, the terrain once it arrives', async ({ page }) => {
    let answer = (): void => undefined;
    const hold = new Promise<void>((resolve) => (answer = resolve));
    await open(page, { at: CANVAS, path: `./${PIN}`, horizon: { hold } });
    await expect(strip(page)).toContainText('Smooth horizon · real terrain loading');
    await evidence(page, 'phone-pin-loading');
    answer();
    await expect(strip(page)).toContainText(LOLA_20);
    await expect(strip(page).locator('.horizon__label')).toHaveText(['Sun', 'Earth · hidden']);
    const { gap } = await fit(page);
    expect(gap).toBeGreaterThanOrEqual(11.5);
    await evidence(page, 'phone-pin-terrain');
  });
});

test.describe('dark, as the canvas', () => {
  test.use({ colorScheme: 'dark' });

  test('desktop: IM-2 on the ridge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, { at: RIDGE, path: './?site=im2-athena' });
    await expect(strip(page)).toContainText(LOLA_20);
    await card(page).locator('.site-card__scroll').evaluate((el) => el.scrollTo(0, 220));
    await evidence(page, 'desktop-im2-ridge-dark');
  });

  test('phone: Haworth', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      colorScheme: 'dark',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await open(page, { at: CANVAS, path: './?site=artemis-haworth' });
    await expect(strip(page)).toContainText(LOLA_20);
    await fit(page);
    await evidence(page, 'phone-390-haworth-dark');
    await context.close();
  });
});
