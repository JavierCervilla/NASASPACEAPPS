/**
 * QA evidence, not a check: screenshots of the globe at 1440x900 in dark and light mode and of the phone view at
 * 390x844, saved under production/qa/evidence/ with the capture date. It runs only on request, so a normal e2e run
 * writes nothing:
 *
 *   CAPTURE_EVIDENCE=1 npm run e2e -- evidence.spec.ts
 */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const SITES = JSON.parse(readFileSync(new URL('../../packages/server/data/sites.json', import.meta.url), 'utf8')) as unknown[];
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = new Date().toISOString().slice(0, 10);

test.describe('globe evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const scheme of ['dark', 'light'] as const) {
    test(`globe, ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
      const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
      // Headless Chromium draws with SwiftShader, which the tier detection rates low (1K map): force the 2K map
      // a desktop GPU gets.
      await page.goto('./?quality=high');
      await texture;
      await expect(page.locator('.globe-label')).toBeVisible();
      // Two frames after the texture decodes, so the screenshot shows the map, not the grey placeholder.
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await page.screenshot({ path: new URL(`${DATE}-vent-6-globe-${scheme}.png`, OUT).pathname });
    });
  }
});

test.describe('phone evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('phone view', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.sites-mobile')).toBeVisible();
    await page.screenshot({ path: new URL(`${DATE}-vent-6-mobile.png`, OUT).pathname });
  });
});
