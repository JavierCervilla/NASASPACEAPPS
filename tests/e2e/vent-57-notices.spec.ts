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
 * VENT-57 part B, variant B of V-08, V-09 and V-11 (the human's choice on the canvas): the floating notices as rows of
 * «New version ready». «Offline» (a cloud mark, «Offline» over «Showing data from <date>», the hint's ✕), «Load the
 * 3D globe» under Save-Data (a globe mark over «Data saver is on», the whole row one button) and «Deleted <name> ·
 * Undo» (a trash mark, the words and a bold «Undo»), anchored above the calendar strip on desktop and above the tab
 * bar on the phone. On the phone the compass stands under the offline row.
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** When the API last answered, as the service worker records it. */
const SYNCED = Date.parse('2026-11-23T12:00:00Z');
const GLOBE_START_MS = 20_000;
const POINT = '?lat=-85.87&lon=61.34';
const SAVED = [
  { id: '@-85.87,61.34', name: 'Rim camp', lat: -85.87, lonEast: 61.34, savedAt: 3 },
  { id: '@-84.20,-40.00', name: 'Cabeus ridge', lat: -84.2, lonEast: -40, savedAt: 2 },
];
/** Room between a row and what it stands above, px (the mockup's). */
const GAP = 12;

type Box = { x: number; y: number; width: number; height: number };

/** Opens `path` at the fixed instant with the API stubbed, the hint seen and `saved` kept on the device. */
async function open(page: Page, path = './', saved: readonly object[] = []): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.addInitScript((sites) => {
    localStorage.setItem('ventana.pinHint', 'seen');
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('ventana.savedSites', sites);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify({ v: 1, sites: saved }));
  await page.goto(path);
}

const globeReady = (page: Page) =>
  expect(page.locator('.globe-viewport[data-status="ready"]:visible').first()).toBeVisible({ timeout: GLOBE_START_MS });

/** Keeps the sync stamp the service worker would have kept, then takes the network away. */
async function goOffline(context: BrowserContext, page: Page): Promise<void> {
  await page.evaluate(async (at) => {
    const cache = await caches.open('vent-57-test');
    await cache.put(new URL('__ventana-synced-at', location.href).href, new Response(String(at)));
  }, SYNCED);
  await context.setOffline(true);
}

const boxOf = async (locator: Locator): Promise<Box> => (await locator.boundingBox())!;

/** How many lines `locator`'s text takes: its height over its line height. */
const lines = (locator: Locator) =>
  locator.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));

/** Waits until two reads of the box 200 ms apart agree: the sheet has stopped rising. */
async function settled(locator: Locator): Promise<void> {
  let last = '';
  await expect
    .poll(async () => {
      await locator.page().waitForTimeout(200);
      const now = JSON.stringify(await locator.boundingBox());
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The offline row's parts, checked: the mark, the two lines in the live region and the ✕ beside them. */
async function expectOfflineRow(page: Page): Promise<Locator> {
  const row = page.locator('.offline-notice');
  const status = row.getByRole('status');
  await expect(status.locator('.notice-row__title')).toHaveText('Offline');
  await expect(status.locator('.notice-row__how')).toHaveText('Showing data from 23 November 2026');
  await expect(row.locator('svg.notice-row__mark')).toHaveAttribute('aria-hidden', 'true');
  await expect(row.getByRole('button')).toHaveCount(1);
  await expect(row.getByRole('button', { name: 'Hide', exact: true })).toBeVisible();
  await expect(status.getByRole('button')).toHaveCount(0);
  return row;
}

test.describe('V-08 «Offline», phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('a row under the top bar, one line each, the compass under it; the ✕ hides it until offline again', async ({ context, page }) => {
    await open(page);
    await globeReady(page);
    await goOffline(context, page);
    const row = await expectOfflineRow(page);
    const bar = await boxOf(page.locator('.phone-bar'));
    await expect.poll(async () => (await boxOf(row)).y).toBeGreaterThanOrEqual(bar.y + bar.height);
    await expect(row.locator('.notice-row__title')).toHaveCSS('white-space', 'nowrap');
    expect(await lines(row.locator('.notice-row__title'))).toBe(1);
    expect(await lines(row.locator('.notice-row__how'))).toBe(1);
    // The row is its words' width, centred, never from half the view.
    const box = await boxOf(row);
    expect(Math.abs(box.x + box.width / 2 - 195)).toBeLessThanOrEqual(1);
    expect(box.x).toBeGreaterThanOrEqual(16);
    // The compass comes down under it, as under «New version ready».
    const compass = page.locator('.compass');
    await expect.poll(async () => (await boxOf(compass)).y).toBeGreaterThanOrEqual(box.y + box.height);
    expect(overlaps(box, await boxOf(compass))).toBe(false);
    await page.screenshot({ path: test.info().outputPath('offline-phone.png') });
    await row.getByRole('button', { name: 'Hide' }).click();
    await expect(row.getByRole('status')).toBeEmpty();
    await expect(row.getByRole('button')).toHaveCount(0);
    await expect.poll(async () => (await boxOf(compass)).y).toBeLessThan(box.y + box.height);
    // Back online and offline again, it is back.
    await context.setOffline(false);
    await context.setOffline(true);
    await expectOfflineRow(page);
  });

  test('at 200 % text it keeps to two lines under the grown bar, clear of the site pill', async ({ context, page }) => {
    await open(page);
    await globeReady(page);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await goOffline(context, page);
    const row = await expectOfflineRow(page);
    const bar = await boxOf(page.locator('.phone-bar'));
    await expect.poll(async () => (await boxOf(row)).y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(await lines(row.locator('.notice-row__title'))).toBe(1);
    expect(await lines(row.locator('.notice-row__how'))).toBe(1);
    expect(overlaps(await boxOf(row), await boxOf(page.locator('.site-pill')))).toBe(false);
    expect((await boxOf(row)).width).toBeLessThanOrEqual(390 - 32);
    await page.screenshot({ path: test.info().outputPath('offline-phone-200.png') });
  });
});

test.describe('V-08 «Offline», desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('a row centred under the header', async ({ context, page }) => {
    await open(page);
    await globeReady(page);
    await goOffline(context, page);
    const row = await expectOfflineRow(page);
    const header = await boxOf(page.locator('header.bar'));
    await expect.poll(async () => (await boxOf(row)).y).toBeGreaterThanOrEqual(header.y + header.height);
    const box = await boxOf(row);
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath('offline-desktop.png') });
  });
});

/** Opens the page under Save-Data and returns the «Load the 3D globe» row. */
async function saveDataRow(page: Page): Promise<Locator> {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
  await open(page);
  const load = page.getByRole('button', { name: 'Load the 3D globe', exact: true });
  await expect(load).toBeVisible();
  await expect(load).toHaveAccessibleDescription('Data saver is on');
  await expect(load).toHaveClass('globe-load');
  await expect(load.locator('svg.notice-row__mark')).toHaveAttribute('aria-hidden', 'true');
  await expect(load.locator('.notice-row__title')).toHaveText('Load the 3D globe');
  await expect(load.locator('.notice-row__how')).toHaveText('Data saver is on');
  await expect(load.locator('button')).toHaveCount(0);
  return load;
}

for (const [name, viewport, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]] as const) {
  test.describe(`V-09 «Load the 3D globe», ${name}`, () => {
    test.use({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 });

    test('the whole row is the button: a press at its edge loads the globe', async ({ page }) => {
      const load = await saveDataRow(page);
      const box = await boxOf(load);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: test.info().outputPath(`save-data-${name}.png`) });
      // Near the end of the second line, not on the words' centre.
      await load.click({ position: { x: box.width - 8, y: box.height - 8 } });
      await expect(load).toHaveCount(0);
      await globeReady(page);
    });
  });
}

/** The undo row's parts, checked: the mark, the words and a bold, unfilled «Undo». */
async function expectUndoRow(page: Page, words: string): Promise<Locator> {
  const toast = page.locator('.undo-toast');
  await expect(toast).toHaveAttribute('data-open', 'true');
  await expect(toast).toHaveRole('status');
  await expect(toast.locator('svg.notice-row__mark')).toHaveAttribute('aria-hidden', 'true');
  await expect(toast.locator('.undo-toast__text')).toHaveText(words);
  const undo = toast.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toHaveCSS('font-weight', '600');
  await expect(undo).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect((await boxOf(undo)).height).toBeGreaterThanOrEqual(44);
  return toast;
}

test.describe('V-11 «Deleted · Undo», desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('stands above the calendar strip, never over it', async ({ page }) => {
    await open(page, `./${POINT}`, SAVED);
    await globeReady(page);
    const card = page.getByRole('complementary', { name: 'Site card' });
    await card.getByRole('button', { name: /^Saved/ }).click();
    const toast = await expectUndoRow(page, 'Deleted Rim camp');
    const strip = await boxOf(page.locator('.strip'));
    await expect.poll(async () => {
      const box = await boxOf(toast);
      return Math.round(strip.y - (box.y + box.height));
    }).toBe(GAP);
    expect(overlaps(await boxOf(toast), strip)).toBe(false);
    await page.screenshot({ path: test.info().outputPath('undo-desktop.png') });
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(toast).toHaveAttribute('data-open', 'false');
  });
});

test.describe('V-11 «Deleted · Undo», phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('stands above the tab bar', async ({ page }) => {
    await open(page, `./${POINT}`, SAVED);
    await page.getByRole('button', { name: 'Sites', exact: true }).click();
    const sheet = page.locator('.picker');
    const more = sheet.getByRole('button', { name: 'More for Cabeus ridge' });
    await expect(more).toBeVisible();
    await settled(more);
    await more.click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const toast = await expectUndoRow(page, 'Deleted Cabeus ridge');
    const tabs = await boxOf(page.locator('.tab-bar'));
    await expect.poll(async () => {
      const box = await boxOf(toast);
      return Math.round(tabs.y - (box.y + box.height));
    }).toBe(GAP);
    await page.screenshot({ path: test.info().outputPath('undo-phone.png') });
  });
});
