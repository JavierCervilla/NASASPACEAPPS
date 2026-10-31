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
 * The data source (VENT-36, validated canvas option C): the simulator answers at once, with the pill's dot hollow until
 * Horizons arrives; «Computed | Horizons | Compare» switches the whole view from the desktop Layers key and from the
 * phone's Sites sheet, and the choice survives a reload; «Compare» hatches the hours where the two disagree and counts
 * them, or says it cannot compare without Horizons. Also: no CSP violation and the switch whole at 200 % text.
 *
 * With CAPTURE_EVIDENCE=1 it also saves the desktop and phone screens of each mode under production/qa/evidence/.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { SITES, stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = new Date().toISOString().slice(0, 10);
const IM2_HOURS = (
  JSON.parse(readFileSync(new URL('./fixtures/im2-athena-2026-11.json', import.meta.url), 'utf8')) as {
    ephemeris: { hours: { t: string; sunEl: number }[] };
  }
).ephemeris.hours;
/** An hour of a long Sun-up run at IM-2 (Sun 6.7° up in Horizons): the stub sets it in Compare's test. */
const NIGHT_HOUR = '2026-11-22T18:00:00Z';
/** Where that hour sits across November: hour 522 of 720. */
const NIGHT_PCT = `${(100 * (21 * 24 + 18)) / 720}%`;

const dot = (page: Page) => page.locator('.site-pill .signal-dot');
const switchIn = (page: Page, scope: string) => page.locator(scope).getByRole('radiogroup', { name: 'Data source' });
const option = (page: Page, scope: string, name: string) => switchIn(page, scope).getByRole('radio', { name });
const LAYERS = '.globe .globe-layers';
const SHEET = '.sheet';

/** IM-2's real hours with the Sun set at {@link NIGHT_HOUR}, so Horizons and the simulator disagree there. */
async function stubWithNight(page: Page): Promise<void> {
  await stubApi(page);
  await page.route(/\/api\/v1\/sites\/im2-athena\?/, async (route) => {
    const url = new URL(route.request().url());
    const from = Date.parse(url.searchParams.get('from') ?? '');
    const to = Date.parse(url.searchParams.get('to') ?? '');
    const hours = IM2_HOURS.filter(({ t }) => Date.parse(t) >= from && Date.parse(t) <= to).map((h) =>
      h.t === NIGHT_HOUR ? { ...h, sunEl: -5 } : h,
    );
    return route.fulfill({ json: { site: SITES.find((s) => s.id === 'im2-athena'), ephemeris: { hours } } });
  });
}

async function open(page: Page, query = ''): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await page.goto(`./${query}`);
}

/** The CSP nginx sends for the built site (packages/web/scripts/csp-header.mjs, as the Dockerfile runs it). */
function builtPolicy(): string {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  return /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
}

/** Serves the page with the production CSP and records each violation. */
async function underPolicy(page: Page): Promise<void> {
  const policy = builtPolicy();
  await page.route(/\/(\?.*)?(#.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { violations: string[] }).violations = violations;
    document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { violations: string[] }).violations);

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: new URL(`${DATE}-vent-36-${name}.png`, OUT).pathname });
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  const openSites = async (page: Page) => {
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await expect(switchIn(page, SHEET)).toBeVisible();
  };

  test('with the API delayed, the pill shows the computed state with a hollow dot at once, filled when Horizons answers', async ({
    page,
  }) => {
    let answer = (): void => undefined;
    await stubApi(page, { hold: new Promise<void>((done) => (answer = done)) });
    await open(page);
    await expect(dot(page)).toHaveAttribute('data-state', 'window');
    await expect(dot(page)).toHaveAttribute('data-computed', 'true');
    await expect(page.locator('.site-pill')).toHaveAccessibleName(/, computed$/);
    expect(await dot(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await evidence(page, 'phone-pill-computed');
    answer();
    await expect(dot(page)).toHaveAttribute('data-computed', 'false');
    await expect(page.locator('.site-pill')).not.toHaveAccessibleName(/computed/);
    expect(await dot(page).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    await evidence(page, 'phone-pill-horizons');
  });

  test('the Sites sheet switches the view, with the keyboard too, and the choice survives a reload', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await expect(dot(page)).toHaveAttribute('data-computed', 'false');
    await openSites(page);
    await expect(option(page, SHEET, 'Horizons')).toHaveAttribute('aria-checked', 'true');
    await evidence(page, 'phone-sites-horizons');
    await option(page, SHEET, 'Computed').click();
    await expect(option(page, SHEET, 'Computed')).toHaveAttribute('aria-checked', 'true');
    // Computed stays hollow: the state is the simulator's, whatever Horizons says.
    await expect(dot(page)).toHaveAttribute('data-computed', 'true');
    await evidence(page, 'phone-sites-computed');
    await option(page, SHEET, 'Computed').press('ArrowRight');
    await expect(option(page, SHEET, 'Horizons')).toBeFocused();
    await expect(option(page, SHEET, 'Horizons')).toHaveAttribute('aria-checked', 'true');
    await expect(dot(page)).toHaveAttribute('data-computed', 'false');
    await option(page, SHEET, 'Horizons').press('ArrowLeft');
    await page.reload();
    await expect(dot(page)).toHaveAttribute('data-computed', 'true');
    await openSites(page);
    await expect(option(page, SHEET, 'Computed')).toHaveAttribute('aria-checked', 'true');
    await expect(option(page, SHEET, 'Computed')).toHaveAttribute('tabindex', '0');
    await expect(option(page, SHEET, 'Compare')).toHaveAttribute('tabindex', '-1');
  });

  test('Compare hatches the hour that disagrees in the Calendar sheet and counts it', async ({ page }) => {
    await stubWithNight(page);
    await open(page);
    await openSites(page);
    await option(page, SHEET, 'Compare').click();
    await evidence(page, 'phone-sites-compare');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.calendar__compare')).toHaveText(/^\d+ h differs? this month$/);
    const sun = page.locator('.columns .signal-bar[data-tone="sun"] .signal-bar__differs');
    await expect(sun.first()).toBeAttached();
    const tops = await sun.evaluateAll((spans) => spans.map((s) => (s as HTMLElement).style.top));
    expect(tops).toContain(NIGHT_PCT);
    await evidence(page, 'phone-calendar-compare');
  });

  test('at 200 % text the Data source row stays whole inside the sheet', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await openSites(page);
    const sheet = (await page.locator(SHEET).boundingBox())!;
    for (const name of ['Computed', 'Horizons', 'Compare']) {
      const box = (await option(page, SHEET, name).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(sheet.x);
      expect(box.x + box.width).toBeLessThanOrEqual(sheet.x + sheet.width + 0.5);
      expect(await option(page, SHEET, name).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await evidence(page, 'phone-sites-200-text');
  });

  test('under the production CSP, switching raises no violation', async ({ page }) => {
    await underPolicy(page);
    await stubApi(page);
    await open(page);
    await openSites(page);
    for (const name of ['Computed', 'Compare', 'Horizons']) await option(page, SHEET, name).click();
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await page.waitForTimeout(500);
    expect(await violations(page)).toEqual([]);
  });
});

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const card = (page: Page) => page.getByRole('complementary', { name: 'Site' });
  const badge = (page: Page) => page.locator('.card-media__badge');

  test('the Layers key switches the whole view, and the choice survives a reload', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await expect(card(page).getByText(/JPL Horizons, 1 h step/)).toBeVisible();
    await expect(badge(page)).toHaveAttribute('data-computed', 'false');
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-computed', 'false');
    await evidence(page, 'desktop-horizons');
    await option(page, LAYERS, 'Computed').click();
    await expect(card(page).getByText(/computed here, 1 h step/)).toBeVisible();
    await expect(badge(page)).toHaveAttribute('data-computed', 'true');
    await expect(badge(page)).toContainText('Landing window now, computed');
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-computed', 'true');
    await evidence(page, 'desktop-computed');
    await page.reload();
    await expect(option(page, LAYERS, 'Computed')).toHaveAttribute('aria-checked', 'true');
    await expect(card(page).getByText(/computed here, 1 h step/)).toBeVisible();
  });

  test('Compare hatches the hour that disagrees on the strip, counts it and keys it', async ({ page }) => {
    await stubWithNight(page);
    await open(page);
    await option(page, LAYERS, 'Compare').click();
    await expect(page.locator('.strip__compare')).toHaveText(/^\d+ h differs? this month$/);
    await expect(page.getByRole('list', { name: 'Legend' })).toContainText('Differs');
    const sun = page.locator('.strip .signal-bar[data-tone="sun"] .signal-bar__differs');
    await expect(sun.first()).toBeAttached();
    const lefts = await sun.evaluateAll((spans) => spans.map((s) => (s as HTMLElement).style.left));
    expect(lefts).toContain(NIGHT_PCT);
    // The view shows Horizons: the card names it, and the dot is full.
    await expect(card(page).getByText(/JPL Horizons, 1 h step/)).toBeVisible();
    await expect(badge(page)).toHaveAttribute('data-computed', 'false');
    await evidence(page, 'desktop-compare');
  });

  test('Compare says so when Horizons is unavailable, instead of hatching nothing as if all agreed', async ({ page }) => {
    await stubApi(page, { status: 500 });
    await open(page);
    await option(page, LAYERS, 'Compare').click();
    await expect(page.locator('.strip__compare')).toHaveText('Horizons unavailable: nothing to compare');
    await expect(page.locator('.signal-bar__differs')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Legend' })).not.toContainText('Differs');
  });

  test('the switch is a radio group the arrows move through', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await option(page, LAYERS, 'Horizons').focus();
    await page.keyboard.press('ArrowRight');
    await expect(option(page, LAYERS, 'Compare')).toBeFocused();
    await expect(option(page, LAYERS, 'Compare')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(option(page, LAYERS, 'Computed')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('End');
    await expect(option(page, LAYERS, 'Compare')).toHaveAttribute('aria-checked', 'true');
  });

  test('under the production CSP, switching raises no violation', async ({ page }) => {
    await underPolicy(page);
    await stubWithNight(page);
    await open(page);
    for (const name of ['Computed', 'Compare', 'Horizons']) await option(page, LAYERS, name).click();
    await page.waitForTimeout(500);
    expect(await violations(page)).toEqual([]);
  });

  test('at 200 % text the switch stays whole inside the Layers key', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const layers = page.locator(LAYERS);
    if (!(await layers.isVisible())) return;
    const box = (await layers.boundingBox())!;
    for (const name of ['Computed', 'Horizons', 'Compare']) {
      const own = (await option(page, LAYERS, name).boundingBox())!;
      expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
      expect(await option(page, LAYERS, name).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await evidence(page, 'desktop-200-text');
  });
});
