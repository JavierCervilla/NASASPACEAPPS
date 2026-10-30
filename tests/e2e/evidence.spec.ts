/**
 * QA evidence, not a check: screenshots of the globe at 1440x900 in dark and light mode, a close-up of the south pole
 * terminator before and after the sharper maps and the LOLA relief, and of the phone at 390x844 (the sheet at half in
 * dark and light, the site picker, and the sheet closed), saved under production/qa/evidence/ with the capture date. It
 * runs only on request, so a normal e2e run writes nothing:
 *
 *   CAPTURE_EVIDENCE=1 npm run e2e -- evidence.spec.ts
 *
 * `-g phone` or `-g globe` captures one set only.
 */
import { expect, test, type Page } from '@playwright/test';
import { SITES, stubApi } from './api-stub';

const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = new Date().toISOString().slice(0, 10);

/** Two frames after the texture decodes, so the screenshot shows the map, not the grey placeholder. */
const settle = (page: Page) =>
  page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

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
      await settle(page);
      await page.screenshot({ path: new URL(`${DATE}-vent-6-globe-${scheme}.png`, OUT).pathname });
    });
  }
});

test.describe('relief evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');
  test.use({ viewport: { width: 1440, height: 900 } });

  // From the opening view: 60° east and 30° further south, then zoomed to the orbit's closest distance, where the
  // terminator crosses the south polar region on the canvas's date.
  const TURN = [...Array(6).fill('ArrowRight'), ...Array(3).fill('ArrowDown'), ...Array(9).fill('+')] as string[];

  for (const stage of ['before', 'after'] as const) {
    test(`south pole terminator, zoomed in, ${stage}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await page.clock.setFixedTime(new Date('2026-11-23T18:00:00Z'));
      await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
      // «Before» is the globe as VENT-6 shipped it: the 2K map alone, no sharper map and no relief.
      if (stage === 'before') await page.route(/moon-lroc-[48]k|moon-lola-normal/, (route) => route.abort());
      const start = page.waitForResponse(/\/textures\/moon-lroc-2k/);
      await page.goto('./?quality=high');
      await start;
      await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
      const sharpest = stage === 'after' ? page.waitForResponse(/\/textures\/moon-lroc-8k/) : null;
      for (const key of TURN) await page.keyboard.press(key);
      await sharpest;
      // The swap uploads the map before it shows: give it a moment, then two frames.
      await page.waitForTimeout(1500);
      await settle(page);
      await page.screenshot({ path: new URL(`${DATE}-vent-24-terminator-${stage}.png`, OUT).pathname });
    });
  }
});

test.describe('phone evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  async function openPhone(page: Page, scheme: 'dark' | 'light'): Promise<void> {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-11-23T18:00:00Z'));
    await stubApi(page);
    const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
    await page.goto('./');
    await texture;
    await expect(page.locator('.widget')).toHaveCount(4);
    await settle(page);
  }

  for (const scheme of ['dark', 'light'] as const) {
    test(`phone, sheet at half, ${scheme} mode`, async ({ page }) => {
      await openPhone(page, scheme);
      await page.screenshot({ path: new URL(`${DATE}-vent-23-phone-${scheme}.png`, OUT).pathname });
    });
  }

  test('phone, sheet closed', async ({ page }) => {
    await openPhone(page, 'dark');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-24-phone-closed.png`, OUT).pathname });
  });

  test('phone, site picker open', async ({ page }) => {
    await openPhone(page, 'dark');
    await page.getByRole('button', { name: 'Change site, now IM-2' }).click();
    await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-23-phone-picker.png`, OUT).pathname });
  });
});
