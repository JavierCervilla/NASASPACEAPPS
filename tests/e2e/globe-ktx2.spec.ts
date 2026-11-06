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
 * The globe's colour maps as KTX2 (VENT-101), under the production CSP: the page's policy as nginx sends it
 * (packages/web/scripts/csp-header.mjs) and the transcoder worker's own (nginx-basis-worker-headers.conf), routed as
 * data-source.spec.ts routes the page's. Where the GPU takes it (SwiftShader here: BC1), the 2K colour comes as KTX2
 * and the readout's texture memory drops; a worker whose response lacks 'unsafe-eval' cannot load the transcoder, and
 * the globe falls back to the JPEG with no page error; `?ktx2=0` never asks for KTX2 or the worker.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
const WORKER_HEADERS = readFileSync(new URL('../../nginx-basis-worker-headers.conf', import.meta.url), 'utf8');
/** The breadcrumbs' storage key (src/devtools/breadcrumbs.ts). */
const CRUMBS_KEY = 'ventana.devtools.breadcrumbs';
// Software GL: a map takes a while to decode, and the tools come after start.
const MAP_MS = 30_000;
const WORKER = /\/_astro\/basis-worker[.-][^/]*\.js$/;

/** The page's CSP as nginx sends it for this build. */
function pagePolicy(): string {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  return /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
}

/** The worker's CSP, read from its nginx snippet. */
const workerPolicy = (): string => /Content-Security-Policy "([^"]+)"/.exec(WORKER_HEADERS)![1]!;

/** Serves the page and the worker with these policies, recording violations and page errors. */
async function underPolicies(page: Page, worker: string): Promise<string[]> {
  const page_ = pagePolicy();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/\/(\?.*)?(#.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': page_ } });
  });
  await page.route(WORKER, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': worker } });
  });
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { violations: string[] }).violations = seen;
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return errors;
}

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

/** The readout's texture memory, in MB, once the 2K maps are on the Moon. */
async function textureMB(page: Page): Promise<number> {
  await expect.poll(() => globeLines(page), { timeout: MAP_MS }).toContain('globe: 2K on the Moon');
  let mb = 0;
  await expect.poll(async () => {
    mb = Number(/textures (\d+) MB/.exec(await readoutText(page))?.[1] ?? NaN);
    return mb;
  }, { timeout: MAP_MS }).toBeGreaterThan(0);
  return mb;
}

/** Opens the high tier's globe (a 2K start) under `worker`'s CSP, with `?debug`. */
async function openHigh(page: Page, worker: string, extra = ''): Promise<{ errors: string[]; asked: string[] }> {
  const asked: string[] = [];
  page.on('request', (request) => asked.push(new URL(request.url()).pathname));
  const errors = await underPolicies(page, worker);
  await stubApi(page);
  await page.goto(`./?quality=high&debug${extra}`);
  return { errors, asked };
}

test.describe('the globe\'s KTX2 colour maps, desktop 1440x900 (VENT-101)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the 2K colour comes as KTX2 in BC1 through the worker under its own CSP, and the textures take less memory', async ({ page }) => {
    const { errors, asked } = await openHigh(page, workerPolicy());
    const mb = await textureMB(page);
    expect(await globeLines(page)).toEqual(expect.arrayContaining([
      'globe: 2K colour loading: moon-lroc-2k.ktx2',
      'globe: 2K colour as KTX2 → BC1',
      'globe: 2K on the Moon',
    ]));
    expect(await globeLines(page)).not.toContainEqual(expect.stringMatching(/^globe: KTX2 off/));
    expect(asked).not.toContain('/textures/moon-lroc-2k.jpg');
    expect(asked).toEqual(expect.arrayContaining([expect.stringMatching(/^\/basis\/[\d.]+\/basis_transcoder\.wasm$/)]));
    // 2K colour BC1 (1.4 MB) + 2K relief RGBA (11.2 MB), against 22.4 MB with both RGBA.
    expect(mb).toBeLessThanOrEqual(13);
    expect(await readoutText(page)).toContain('\nktx2 → BC1\n');
    expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('a worker without \'unsafe-eval\' cannot load the transcoder: the globe takes the 2K JPEG, with no page error', async ({ page }) => {
    const strict = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";
    const { errors, asked } = await openHigh(page, strict);
    const mb = await textureMB(page);
    expect(await globeLines(page)).toEqual(expect.arrayContaining([
      expect.stringMatching(/^globe: KTX2 off: /),
      'globe: 2K on the Moon',
    ]));
    expect(await globeLines(page)).not.toContain('globe: 2K colour as KTX2 → BC1');
    expect(asked).toContain('/textures/moon-lroc-2k.jpg');
    expect(mb).toBeGreaterThan(20);
    expect(await readoutText(page)).toMatch(/\nktx2 off: [^\n]+\n/);
    expect(errors).toEqual([]);
  });

  test('?ktx2=0 asks for no KTX2 map and no worker, and says why', async ({ page }) => {
    const { errors, asked } = await openHigh(page, workerPolicy(), '&ktx2=0');
    const mb = await textureMB(page);
    expect(asked.filter((path) => /\.ktx2$|basis/.test(path))).toEqual([]);
    expect(asked).toContain('/textures/moon-lroc-2k.jpg');
    expect(mb).toBeGreaterThan(20);
    expect(await readoutText(page)).toContain('\nktx2 off: ?ktx2=0\n');
    expect(errors).toEqual([]);
  });

  test('under Save-Data asks for no KTX2 map, no transcoder and no worker, and says why (VENT-107)', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const { errors, asked } = await openHigh(page, workerPolicy());
    await page.getByRole('button', { name: 'Load the 3D globe' }).click();
    await textureMB(page);
    expect(asked.filter((path) => /\.ktx2$|basis/.test(path))).toEqual([]);
    expect(asked).toContain('/textures/moon-lroc-2k.jpg');
    expect(await readoutText(page)).toContain('\nktx2 off: Save-Data\n');
    expect(errors).toEqual([]);
  });
});
