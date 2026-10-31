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
 * QA evidence, not a check: screenshots of the globe at 1440x900 in dark and light mode, a close-up of the south pole
 * terminator before and after the sharper maps and the LOLA relief, the desktop calendar strip (also at 1280x720) and
 * header site picker, the site card beside the globe (also at 1280x720, where it scrolls and fades at its edge) and
 * the polar map with it (also with IM-2 not selected, where crowded markers wear numbers its key names), and of the
 * phone at 390x844 (the sheet at half in dark and light, the site picker, the sheet at peek, the sheet closed, also
 * zoomed in, and the calendar, also at 200 % text), the Liquid and the frosted glass on both (VENT-27), saved under production/qa/evidence/ with the capture date. It runs only on request, so a normal e2e run writes nothing:
 *
 *   CAPTURE_EVIDENCE=1 npm run e2e -- evidence.spec.ts
 *
 * `-g phone`, `-g globe`, `-g calendar`, `-g "site card"` or `-g glass` captures one set only.
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
      await expect(page.locator('.globe-callout')).toBeVisible();
      await settle(page);
      await page.screenshot({ path: new URL(`${DATE}-vent-6-globe-${scheme}.png`, OUT).pathname });
    });
  }
});

test.describe('calendar evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');
  test.use({ viewport: { width: 1440, height: 900 } });

  async function openDesktop(page: Page): Promise<void> {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-11-23T18:00:00Z'));
    await stubApi(page);
    const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
    await page.goto('./?quality=high');
    await texture;
    await expect(page.getByRole('img', { name: /^Window:/ })).toBeVisible();
    await expect(page.locator('.globe-callout')).toBeVisible();
    await settle(page);
  }

  test('calendar strip under the globe, dark mode', async ({ page }) => {
    await openDesktop(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-4-calendar-strip-dark.png`, OUT).pathname });
  });

  test('calendar strip under the globe, 1280x720, dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openDesktop(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-4-calendar-strip-1280x720-dark.png`, OUT).pathname });
  });

  test('calendar, header site picker open, dark mode', async ({ page }) => {
    await openDesktop(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    await expect(page.getByRole('dialog', { name: 'Choose a site' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-4-site-picker-dark.png`, OUT).pathname });
  });
});

test.describe('site card evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');
  test.use({ viewport: { width: 1440, height: 900 } });

  async function openCard(page: Page): Promise<void> {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-11-23T18:00:00Z'));
    await stubApi(page);
    const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
    await page.goto('./?quality=high');
    await texture;
    await expect(page.getByRole('complementary', { name: 'Site card' }).getByText('Longest night')).toBeVisible();
    await expect(page.locator('.globe-callout')).toBeVisible();
    await settle(page);
  }

  test('site card beside the globe, dark mode', async ({ page }) => {
    await openCard(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-5-site-card-globe-dark.png`, OUT).pathname });
  });

  test('polar map with the site card, dark mode', async ({ page }) => {
    await openCard(page);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Polar map' }).click();
    const image = page.locator('img.polar__image');
    // The image decodes off the main thread: wait until it can paint.
    await image.evaluate((img: HTMLImageElement) => img.decode());
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-5-polar-map-dark.png`, OUT).pathname });
  });

  test('polar map, numbered sites and their key, Haworth selected, dark mode', async ({ page }) => {
    await openCard(page);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Polar map' }).click();
    const image = page.locator('img.polar__image');
    await image.evaluate((img: HTMLImageElement) => img.decode());
    await page.getByRole('button', { name: /^Haworth/ }).click();
    await page.mouse.move(0, 0);
    await expect(page.locator('.polar-key li').first()).toBeVisible();
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-5-polar-map-numbered-dark.png`, OUT).pathname });
  });

  test('site card at 1280x720, scrolling with its edge fade, dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openCard(page);
    await expect(page.getByRole('group', { name: 'Site details' })).toHaveAttribute('data-fade-bottom', 'true');
    await page.screenshot({ path: new URL(`${DATE}-vent-5-site-card-1280x720-fade-dark.png`, OUT).pathname });
  });
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

  test('phone, sheet closed, zoomed in', async ({ page }) => {
    await openPhone(page, 'dark');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 9; press += 1) await page.keyboard.press('+');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-24-phone-closed-zoomed.png`, OUT).pathname });
  });

  test('phone, sheet at peek', async ({ page }) => {
    await openPhone(page, 'dark');
    await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
    await page.getByRole('button', { name: /^Sheet full height/ }).press('Enter');
    await expect(page.getByRole('button', { name: /^Sheet collapsed/ })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-24-phone-peek.png`, OUT).pathname });
  });

  test('phone, calendar', async ({ page }) => {
    await openPhone(page, 'dark');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-4-phone-calendar-dark.png`, OUT).pathname });
  });

  test('phone, calendar, 200 % text, light mode', async ({ page }) => {
    await openPhone(page, 'light');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    // The full sheet moves down under the grown bar.
    const edges = () =>
      page.evaluate(() => {
        const bar = document.querySelector('.phone-bar')?.getBoundingClientRect().bottom ?? 0;
        return (document.querySelector('.sheet')?.getBoundingClientRect().top ?? 0) >= bar;
      });
    await expect.poll(edges).toBe(true);
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-4-phone-calendar-text-200.png`, OUT).pathname });
  });

  test('phone, site picker open', async ({ page }) => {
    await openPhone(page, 'dark');
    await page.getByRole('button', { name: 'Change site, now IM-2' }).click();
    await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
    await settle(page);
    await page.screenshot({ path: new URL(`${DATE}-vent-23-phone-picker.png`, OUT).pathname });
  });
});

test.describe('callout evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');

  /** The canvas's date and IM-2's real hours, the globe's texture decoded and the callout's thumbnail painted. */
  async function openCallout(page: Page, phone: boolean): Promise<void> {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-11-23T18:00:00Z'));
    await stubApi(page);
    const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
    await page.goto(phone ? './' : './?quality=high');
    await texture;
    if (phone) {
      await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
      await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
    }
    await expect(page.locator('.globe-callout')).toHaveAttribute('data-state', 'window');
    await page.locator('.globe-callout__image').evaluate((img: HTMLImageElement) => img.decode());
    await page.waitForTimeout(600);
    await settle(page);
  }

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('globe callout, image card, dark mode', async ({ page }) => {
      await openCallout(page, false);
      await page.screenshot({ path: new URL(`${DATE}-vent-29-callout-desktop-dark.png`, OUT).pathname });
    });
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

    test('globe callout, compact card, sheet closed, dark mode', async ({ page }) => {
      await openCallout(page, true);
      await page.screenshot({ path: new URL(`${DATE}-vent-29-callout-phone-dark.png`, OUT).pathname });
    });
  });
});

test.describe('glass evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');

  /** The page in dark mode with `glass` forced: headless Chromium could not hold Liquid's frame budget on its own. */
  async function openGlass(page: Page, query: string): Promise<void> {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-11-23T18:00:00Z'));
    await stubApi(page);
    const texture = page.waitForResponse(/\/textures\/moon-lroc-/);
    await page.goto(`./${query}`);
    await texture;
    await expect(page.locator('.globe-callout')).toHaveAttribute('data-state', 'window');
    await page.locator('.globe-callout__image').evaluate((img: HTMLImageElement) => img.decode());
    await page.waitForTimeout(600);
    await settle(page);
  }

  for (const glass of ['liquid', 'frosted'] as const) {
    test.describe(`desktop, ${glass}`, () => {
      test.use({ viewport: { width: 1440, height: 900 } });

      test(`glass, desktop, ${glass}, dark mode`, async ({ page }) => {
        await openGlass(page, `?quality=high&glass=${glass}`);
        await page.screenshot({ path: new URL(`${DATE}-vent-27-glass-desktop-${glass}-dark.png`, OUT).pathname });
      });
    });

    test.describe(`phone, ${glass}`, () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

      test(`glass, phone, ${glass}, dark mode`, async ({ page }) => {
        await openGlass(page, `?glass=${glass}`);
        await expect(page.locator('.widget')).toHaveCount(4);
        await page.screenshot({ path: new URL(`${DATE}-vent-27-glass-phone-${glass}-dark.png`, OUT).pathname });
      });
    });
  }
});
