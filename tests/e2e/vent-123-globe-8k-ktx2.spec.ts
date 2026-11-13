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
 * The 8K Moon map on a phone, as KTX2 only (VENT-123), under the production CSP (prod-csp.ts). A phone or a touch screen
 * at the medium tier climbs to 8K only while the session takes KTX2 (SwiftShader's target here: BC1): about 22 MB of
 * GPU memory transcoded in the worker, where the 8K JPEG is 179 MB decoded on the main thread. It never asks the 8K
 * JPEG: with `?ktx2=0` it stops at 4K, and when the 8K KTX2 fails it gives the 8K up for the session and stays on 4K,
 * without asking it again. A desktop at the medium tier still reaches 8K, now as KTX2.
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { stubApi } from './api-stub';
import { underPolicies, workerPolicy } from './prod-csp';

/** The breadcrumbs' storage key (src/devtools/breadcrumbs.ts). */
const CRUMBS_KEY = 'ventana.devtools.breadcrumbs';
// Software GL: the 8K transcodes and uploads slowly, and the tools come after start.
const MAP_MS = 60_000;
// Presses of «+» that take the camera to its closest zoom, where the phone's disc wants 8K.
const ZOOM_PRESSES = 12;
const JPEG_8K = 'moon-lroc-8k.jpg';
const KTX2_8K = 'moon-lroc-8k.ktx2';
// A second ask of a failed level comes 2 s later at the earliest (level-backoff.ts): wait well past it.
const NO_RETRY_MS = 6000;

const globeLines = (page: Page): Promise<string[]> =>
  page.evaluate((key) => (JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
    .map((line) => line.replace(/^\d+\.\ds /, ''))
    .filter((line) => line.startsWith('globe: ')), CRUMBS_KEY);

/** The readout's text, unfolded. */
async function readoutText(page: Page): Promise<string> {
  const readout = page.locator('[data-devtools]');
  await expect(readout).toBeVisible({ timeout: MAP_MS });
  const button = readout.getByRole('button', { name: 'Performance readout' });
  if ((await button.getAttribute('aria-expanded')) === 'false') await button.click();
  return (await page.locator('#ventana-perf-hud-text').textContent()) ?? '';
}

/** Opens the globe at the medium tier under the production CSP, recording the Moon maps asked for. */
async function openMedium(page: Page, extra = ''): Promise<{ errors: string[]; asked: string[] }> {
  const asked: string[] = [];
  page.on('request', (r) => {
    if (/\/textures\/moon-/.test(r.url())) asked.push(new URL(r.url()).pathname.split('/').pop() ?? '');
  });
  const errors = await underPolicies(page, workerPolicy());
  await stubApi(page);
  await page.goto(`./?quality=medium&debug${extra}`);
  await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toContain('globe: 1K on the Moon');
  return { errors, asked };
}

/** Zooms the globe all the way in from the keyboard. */
async function zoomIn(page: Page): Promise<void> {
  await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
  for (let i = 0; i < ZOOM_PRESSES; i++) await page.keyboard.press('+');
}

/** The readout's texture memory once the 8K is on the Moon, and how long its colour took to land. */
async function eightK(page: Page): Promise<{ mb: number; landed: string }> {
  await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toContain('globe: 8K on the Moon');
  const lines = await globeLines(page);
  const landed = lines.find((line) => line.startsWith('globe: 8K colour landed in ')) ?? '';
  let mb = 0;
  await expect.poll(async () => {
    mb = Number(/textures (\d+) MB/.exec(await readoutText(page))?.[1] ?? NaN);
    return mb;
  }, { timeout: MAP_MS }).toBeGreaterThan(0);
  return { mb, landed };
}

/** The phone's run to 8K as KTX2: asked, transcoded to BC1, on the Moon; never the JPEG, no page error. */
async function climbsAsKtx2(page: Page, testInfo: TestInfo) {
  const { errors, asked } = await openMedium(page);
  await zoomIn(page);
  const { mb, landed } = await eightK(page);
  testInfo.annotations.push({ type: 'measured', description: `${landed}; textures ${mb} MB` });
  expect(await globeLines(page)).toEqual(expect.arrayContaining([
    `globe: 8K colour loading: ${KTX2_8K}`,
    'globe: 8K colour as KTX2 → BC1',
    expect.stringMatching(/^globe: rule wants 8K: .*; medium(, phone)?, coarse pointer, KTX2, max \d+$/),
  ]));
  expect(asked).toContain(KTX2_8K);
  expect(asked).not.toContain(JPEG_8K);
  // 8K colour BC1 with its mipmaps (22.4 MB) + the 4K relief RGBA (44.7 MB), against 179 MB for the 8K JPEG alone.
  expect(mb).toBeLessThanOrEqual(70);
  expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  expect(errors).toEqual([]);
}

const PHONE = { deviceScaleFactor: 2.625, hasTouch: true, isMobile: true } as const;

test.describe('a Pixel at the medium tier, 412x915 portrait, touch (VENT-123)', () => {
  test.use({ viewport: { width: 412, height: 915 }, ...PHONE });

  test('zoomed in asks the 8K as KTX2 and reaches 8K on the Moon, never the 8K JPEG', async ({ page }, testInfo) => {
    await climbsAsKtx2(page, testInfo);
  });

  test('with ?ktx2=0 stops at 4K and asks no 8K map', async ({ page }) => {
    const { errors, asked } = await openMedium(page, '&ktx2=0');
    await zoomIn(page);
    await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toContain('globe: 4K on the Moon');
    await expect.poll(async () => (await globeLines(page)).filter((l) => l.startsWith('globe: rule wants ')).at(-1),
      { timeout: MAP_MS }).toMatch(/^globe: rule wants 4K: .*; medium, phone, coarse pointer, max \d+$/);
    await page.waitForLoadState('networkidle');
    expect(asked.filter((name) => name.includes('-8k'))).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('when the 8K KTX2 fails it stays on 4K, never asks the JPEG, and does not ask the KTX2 again', async ({ page }) => {
    await page.route(new RegExp(`/textures/${KTX2_8K.replace('.', '\\.')}$`), (route) => route.abort());
    const { errors, asked } = await openMedium(page);
    await zoomIn(page);
    await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toEqual(expect.arrayContaining([
      expect.stringMatching(/^globe: KTX2 off: /),
      'globe: 8K given up on this device: KTX2 failed, 4K at most',
      'globe: 4K on the Moon',
    ]));
    await page.waitForTimeout(NO_RETRY_MS);
    expect(asked.filter((name) => name === KTX2_8K)).toHaveLength(1);
    expect(asked).not.toContain(JPEG_8K);
    expect(await globeLines(page)).not.toContain('globe: 8K on the Moon');
    expect(errors).toEqual([]);
  });
});

test.describe('a Pixel held sideways at the medium tier, 915x412, touch (VENT-123)', () => {
  test.use({ viewport: { width: 915, height: 412 }, ...PHONE });

  test('zoomed in asks the 8K as KTX2 and reaches 8K on the Moon, never the 8K JPEG', async ({ page }, testInfo) => {
    await climbsAsKtx2(page, testInfo);
  });
});

test.describe('a Retina desktop at the medium tier, 1440x900 (VENT-123)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test('zoomed in still reaches 8K, now as KTX2', async ({ page }, testInfo) => {
    const { errors, asked } = await openMedium(page);
    await zoomIn(page);
    const { mb, landed } = await eightK(page);
    testInfo.annotations.push({ type: 'measured', description: `${landed}; textures ${mb} MB` });
    expect(await globeLines(page)).toContain('globe: 8K colour as KTX2 → BC1');
    expect(asked).toContain(KTX2_8K);
    expect(asked).not.toContain(JPEG_8K);
    expect(errors).toEqual([]);
  });
});
