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

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

// The landing at the domain's root (VENT-109), served by its own preview (playwright.config.ts, project `landing`).
const DIST = fileURLToPath(new URL('../../packages/landing/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
// The landing's pages under the policy nginx sends, computed from its build as the image computes it.
const POLICY = /Content-Security-Policy "([^"]+)"/.exec(execFileSync('node', [CSP_SCRIPT, DIST], { encoding: 'utf8' }))?.[1] ?? '';
// The app's own preview, which serves what the landing links under /app/ (its icons), as nginx does in production.
const APP_ORIGIN = `http://localhost:${Number(process.env.PW_PORT ?? 4321)}`;
const WINDOW = new Date('2026-11-22T20:00:00Z');
const LOCALES = [
  ['', 'en', 'Sun for power.'],
  ['es/', 'es', 'Sol para la energía.'],
  ['fr/', 'fr', 'Le Soleil pour l’énergie.'],
  ['de/', 'de', 'Sonne für Strom.'],
  ['it/', 'it', 'Il Sole per l’energia.'],
] as const;

/** Serves each page under the production policy and records what the page reports wrong. */
async function strict(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  await page.route('**/app/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ response: await route.fetch({ url: `${APP_ORIGIN}${path}` }) });
  });
  await page.route(/\/((es|fr|de|it)\/)?(\?.*)?(#.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': POLICY } });
  });
  return problems;
}

test.describe('the landing (VENT-109)', () => {
  test('answers for IM-2 at the visitor\'s instant, under the production CSP', async ({ page }) => {
    const problems = await strict(page);
    await page.clock.install({ time: WINDOW });
    await page.goto('./');
    const card = page.locator('[data-live-card]');
    await expect(card).toHaveAttribute('data-state', 'window');
    await expect(card.locator('[data-live="verdict"]')).toHaveText('Landing window');
    await expect(card.locator('[data-live="sun"]')).toHaveText('6.7° up');
    await expect(card.locator('[data-live="listening"]')).toContainText('Robledo de Chavela');
    await expect(page.locator('[data-month-text="title"]')).toHaveText('November 2026 at IM-2 Athena');
    await expect(page.locator('[data-bar="window"] .month__run').first()).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('moves the month\'s line and the card on as the clock runs', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-12-02T12:00:00Z') });
    await page.goto('./');
    await expect(page.locator('[data-month-text="title"]')).toHaveText('December 2026 at IM-2 Athena');
    const now = page.locator('[data-month-now]');
    const share = async () => Number(await now.evaluate((n) => getComputedStyle(n).getPropertyValue('--now')));
    const before = await share();
    expect(before).toBeCloseTo((24 + 12) / (31 * 24), 3);
    await page.clock.runFor(2 * 60 * 60 * 1000);
    await expect.poll(share).toBeGreaterThan(before);
  });

  for (const [path, lang, title] of LOCALES) {
    test(`speaks ${lang} and opens the app in ${lang}`, async ({ page }) => {
      const problems = await strict(page);
      await page.goto(`./${path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('h1')).toContainText(title.replace('’', "'"));
      await expect(page.locator('.hero a.button--primary')).toHaveAttribute('href', `/app/${path}`);
      await expect(page.locator(`link[rel="alternate"][hreflang="x-default"]`)).toHaveCount(1);
      expect(problems).toEqual([]);
    });
  }

  for (const width of [360, 820, 1440]) {
    test(`fits ${width} px wide with every target 44 px or more`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('./');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBe(0);
      const small = await page.locator('a:visible').evaluateAll((links) =>
        links.filter((a) => a.getBoundingClientRect().height < 44).map((a) => a.textContent?.trim()),
      );
      expect(small).toEqual([]);
    });
  }

  test('sends an old link to one of the app\'s views on to the app', async ({ page }) => {
    await page.route('**/app/**', (route) => route.fulfill({ body: 'app', contentType: 'text/html' }));
    await page.goto('./es/#horizon');
    await expect(page).toHaveURL(/\/app\/es\/#horizon$/);
  });

  test('keeps its own anchors on the landing', async ({ page }) => {
    await page.goto('./#team');
    await expect(page).toHaveURL(/\/#team$/);
    await expect(page.locator('#team')).toBeInViewport();
  });

  test('stands still under reduced motion and reads without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('./');
    const animation = await page.locator('.hero__title').evaluate((n) => getComputedStyle(n).animationName);
    expect(animation).toBe('none');
    await expect(page.locator('[data-live="verdict"]')).not.toBeEmpty();
    await expect(page.locator('.hero__title')).toHaveCSS('opacity', '1');
    await context.close();
  });
});
