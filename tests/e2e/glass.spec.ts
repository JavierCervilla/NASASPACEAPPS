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
 * The glass gate (VENT-27): which glass the page's floating surfaces wear, Liquid (refraction through
 * `backdrop-filter: url(#glass-liquid)`) or frosted. Headless Chromium draws with SwiftShader, which the tier detection
 * rates low, so the tests that need a capable device pass `?quality=high`. Every value `data-glass` takes is recorded
 * from the first script on, so a test sees a live switch, not just the last value.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));

/** Records every value of the root's data-glass, from before the page's scripts run. */
async function recordGlass(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { glassSeen: string[] }).glassSeen = seen;
    new MutationObserver(() => {
      const value = document.documentElement.getAttribute('data-glass');
      if (value && seen.at(-1) !== value) seen.push(value);
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-glass'] });
  });
}

const glassSeen = (page: Page) => page.evaluate(() => (window as unknown as { glassSeen: string[] }).glassSeen);

/** Opens the page at the canvas's date; `fixedClock: false` keeps the real clock, which the frame probe times. */
async function open(page: Page, query: string, fixedClock = true): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  if (fixedClock) await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await recordGlass(page);
  await page.goto(`./${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-glass', /^(liquid|frosted)$/);
}

/** The computed backdrop-filter of each of `selectors` (the first match of each). */
const backdrops = (page: Page, selectors: readonly string[]) =>
  page.evaluate(
    (list) =>
      list.map((selector) => {
        const el = document.querySelector(selector);
        return [selector, el ? getComputedStyle(el).backdropFilter : 'missing'];
      }),
    selectors,
  );

/** Asks Chromium for prefers-reduced-transparency: reduce, which emulateMedia does not offer. */
async function reduceTransparency(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const SURFACES = ['.bar', '.globe-layers', '.globe-callout', '.strip', '.card-block'];

  test('?glass=liquid refracts every desktop surface, the site popover too', async ({ page }) => {
    await open(page, '?glass=liquid');
    await expect(page.locator('html')).toHaveAttribute('data-glass', 'liquid');
    await expect(page.locator('.card-block').first()).toBeVisible();
    await expect(page.locator('.globe-callout')).toHaveAttribute('data-state', 'window');
    for (const [selector, filter] of await backdrops(page, SURFACES)) {
      expect(filter, selector).toContain('url(');
    }
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    await expect(page.getByRole('dialog', { name: 'Choose a site' })).toBeVisible();
    expect((await backdrops(page, ['.site-popover']))[0]?.[1]).toContain('url(');
  });

  test('?glass=frosted keeps the frosted blur, with no refraction anywhere', async ({ page }) => {
    await open(page, '?glass=frosted');
    expect(await glassSeen(page)).toEqual(['frosted']);
    for (const [selector, filter] of await backdrops(page, SURFACES)) {
      expect(filter, selector).not.toContain('url(');
    }
    expect((await backdrops(page, ['.bar']))[0]?.[1]).toContain('blur(20px)');
  });

  test('a capable device starts on Liquid', async ({ page }) => {
    await open(page, '?quality=high');
    expect((await glassSeen(page))[0]).toBe('liquid');
  });

  test('prefers-reduced-transparency gives frosted, never Liquid', async ({ page }) => {
    await reduceTransparency(page);
    await open(page, '?quality=high');
    await page.waitForTimeout(300);
    expect(await glassSeen(page)).toEqual(['frosted']);
  });

  test('prefers-contrast: more gives frosted, never Liquid', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await open(page, '?quality=high');
    await page.waitForTimeout(300);
    expect(await glassSeen(page)).toEqual(['frosted']);
  });

  test('slow frames switch Liquid to frosted live, and the session stays frosted', async ({ page }) => {
    // Every frame callback takes 40 ms: twice the high tier's budget.
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (fn) =>
        raf((t) => {
          const end = performance.now() + 40;
          while (performance.now() < end);
          fn(t);
        });
    });
    await open(page, '?quality=high', false);
    await expect.poll(() => glassSeen(page), { timeout: 15_000 }).toEqual(['liquid', 'frosted']);
    expect(await page.evaluate(() => sessionStorage.getItem('ventana.glass'))).toBe('frosted');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-glass', 'frosted');
    expect(await glassSeen(page)).toEqual(['frosted']);
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('?glass=liquid refracts the top bar, the sheet, the tab bar and the callout; the pill takes the rim', async ({ page }) => {
    await open(page, '?glass=liquid');
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect(page.locator('.globe-callout')).toHaveAttribute('data-state', 'window');
    for (const [selector, filter] of await backdrops(page, ['.phone-bar', '.sheet', '.tab-bar', '.globe-callout'])) {
      expect(filter, selector).toContain('url(');
    }
    const pill = page.locator('.site-pill');
    expect(await pill.evaluate((el) => getComputedStyle(el).boxShadow)).toContain('inset');
  });

  test('?glass=frosted keeps the phone frosted', async ({ page }) => {
    await open(page, '?glass=frosted');
    for (const [selector, filter] of await backdrops(page, ['.phone-bar', '.sheet', '.tab-bar'])) {
      expect(filter, selector).not.toContain('url(');
    }
  });
});

/** The CSP nginx sends for the built site (packages/web/scripts/csp-header.mjs, as the Dockerfile runs it). */
function builtPolicy(): string {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  return /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
}

for (const [name, viewport, isMobile] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`${name} under the production CSP`, () => {
    test.use({ viewport, isMobile, hasTouch: isMobile });

    test('Liquid and its inline SVG filter raise no CSP violation', async ({ page }) => {
      const policy = builtPolicy();
      expect(policy).toContain("style-src-attr 'none'");
      await page.route(/\/(\?.*)?$/, async (route) => {
        const response = await route.fetch();
        await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
      });
      await page.addInitScript(() => {
        const violations: string[] = [];
        (window as unknown as { violations: string[] }).violations = violations;
        document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
      });
      await open(page, '?glass=liquid');
      const header = await page.evaluate(async () => (await fetch(location.href)).headers.get('content-security-policy'));
      expect(header).toBe(policy);
      await expect(page.locator('html')).toHaveAttribute('data-glass', 'liquid');
      await expect(page.locator('.globe-callout')).toHaveAttribute('data-state', 'window');
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
      expect((await backdrops(page, ['.globe-callout']))[0]?.[1]).toContain('url(');
    });
  });
}
