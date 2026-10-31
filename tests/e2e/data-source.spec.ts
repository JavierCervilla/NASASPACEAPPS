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

type Box = { x: number; y: number; width: number; height: number };
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
const switchIn = (page: Page, scope: string) =>
  page.locator(scope).getByRole('radiogroup', { name: /^(Data source|Fuente de datos)$/ });
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

/** Whether two boxes share any area. */
const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Starts the page on a data source, as if chosen on an earlier visit. */
async function choose(page: Page, source: 'computed' | 'horizons' | 'compare'): Promise<void> {
  await page.addInitScript((kept) => localStorage.setItem('ventana.dataSource', kept), source);
}

const CAPTION_CHECKED = 'Computed by Ventana Lunar · approximate, within 0.05° of JPL Horizons';
const CAPTION_EXTRAPOLATED = 'Computed by Ventana Lunar · extrapolated, not checked against JPL Horizons for this month';
/** A month the simulator was never checked in, outside the API's data window. */
const MARCH_2029 = new Date('2029-03-10T06:00:00Z');

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
    // QA on PR #19: the sheet keys the hatch next to its count.
    await expect(page.getByRole('list', { name: 'Legend' })).toHaveText('Differs');
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
    await expect(page.locator('.site-button')).not.toHaveAccessibleName(/computed/);
    await evidence(page, 'desktop-horizons');
    await option(page, LAYERS, 'Computed').click();
    await expect(card(page).getByText(/computed here, 1 h step/)).toBeVisible();
    await expect(badge(page)).toHaveAttribute('data-computed', 'true');
    await expect(badge(page)).toContainText('Landing window now, computed');
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-computed', 'true');
    // QA on PR #19: the hollow dot is said, as on the phone pill.
    await expect(page.locator('.site-button')).toHaveAccessibleName(/, computed$/);
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
    // QA on PR #19: one hour of hatch was a sliver; it is at least 8 px wide, its gaps dark.
    const hatch = sun.and(page.locator(`[style*="left: ${NIGHT_PCT}"]`));
    expect((await hatch.boundingBox())!.width).toBeGreaterThanOrEqual(8);
    expect(await hatch.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('rgba(7, 8, 11');
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
    // Verificador on PR #19: a hidden key used to pass this test silently.
    await expect(layers).toBeVisible();
    const box = (await layers.boundingBox())!;
    for (const name of ['Computed', 'Horizons', 'Compare']) {
      const own = (await option(page, LAYERS, name).boundingBox())!;
      expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
      expect(await option(page, LAYERS, name).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    // QA on PR #19: «Landing window now» ran into «LOLA · 30 km» on the card's image at this size.
    const badgeBox = (await badge(page).boundingBox())!;
    const captionBox = (await page.locator('.card-media__caption').boundingBox())!;
    expect(overlaps(badgeBox, captionBox)).toBe(false);
    await evidence(page, 'desktop-200-text');
  });
});

test.describe('phone, 390x844: computed data and the stale answer', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // Verificador on PR #19 (calendar/hooks.ts): an answer kept for site A must never show for site B.
  test('switching site while the new one loads shows its computed state, never the last site\'s Horizons', async ({
    page,
  }) => {
    await stubApi(page);
    let releaseA = (): void => undefined;
    const heldA = new Promise<void>((done) => (releaseA = done));
    await page.route(/\/api\/v1\/sites\/im2-athena\?/, async (route) => {
      await heldA;
      await route.fallback();
    });
    // B never answers: it stays on its computed hours.
    await page.route(/\/api\/v1\/sites\/apollo11\?/, () => undefined);
    await open(page);
    await expect(dot(page)).toHaveAttribute('data-computed', 'true');
    releaseA();
    await expect(dot(page)).toHaveAttribute('data-computed', 'false');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.locator('.site-pill')).toHaveAccessibleName(/Mare Tranquillitatis.*, computed$/);
    await expect(dot(page)).toHaveAttribute('data-computed', 'true');
    // Long enough for a stale answer to have been shown.
    await page.waitForTimeout(300);
    await expect(dot(page)).toHaveAttribute('data-computed', 'true');
  });

  // Javier's decision on PR #19: Computed data says it is ours and approximate, wherever it is shown.
  test('Computed captions the summary and the Calendar sheet with the checked bound', async ({ page }) => {
    await choose(page, 'computed');
    await stubApi(page);
    await open(page);
    await expect(page.locator('.summary .source-note--caption')).toHaveText(CAPTION_CHECKED);
    await evidence(page, 'phone-computed-caption');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.calendar .source-note--caption')).toHaveText(CAPTION_CHECKED);
    await expect(page.locator('.calendar .source-note--caption')).toBeInViewport();
    await evidence(page, 'phone-calendar-computed');
  });

  test('Computed answers a month outside the data window, and says it is extrapolated', async ({ page }) => {
    await choose(page, 'computed');
    await stubApi(page);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.clock.setFixedTime(MARCH_2029);
    await page.goto('./');
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect(page.getByText('Outside the data window (2026–2027)')).toHaveCount(0);
    await expect(page.locator('.summary .source-note--caption')).toHaveText(CAPTION_EXTRAPOLATED);
    await evidence(page, 'phone-computed-2029');
  });
});

test.describe('desktop, 1440x900: computed data', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const card = (page: Page) => page.getByRole('complementary', { name: 'Site' });

  test('when Horizons fails, the card keeps the computed figures and says Horizons is down, with a retry', async ({
    page,
  }) => {
    await stubApi(page, { status: 500 });
    await open(page);
    await expect(card(page).getByText(/computed here, 1 h step/)).toBeVisible();
    const down = card(page).getByRole('status').filter({ hasText: 'Horizons unavailable: showing the computed sky' });
    await expect(down).toBeVisible();
    await expect(down.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(card(page).locator('.source-note--caption')).toHaveText(CAPTION_CHECKED);
    await expect(page.locator('.card-media__badge')).toHaveAttribute('data-computed', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await evidence(page, 'desktop-horizons-down');
  });

  test('Horizons shows no caption once it answers; Computed captions the card in a checked month', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await expect(card(page).getByText(/JPL Horizons, 1 h step/)).toBeVisible();
    await expect(card(page).locator('.source-note')).toHaveCount(0);
    await option(page, LAYERS, 'Computed').click();
    await expect(card(page).locator('.source-note--caption')).toHaveText(CAPTION_CHECKED);
  });

  test('Computed answers any month: 2029 has figures, bars and an extrapolated caption; Horizons says it has no data', async ({
    page,
  }) => {
    await choose(page, 'computed');
    await stubApi(page);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.clock.setFixedTime(MARCH_2029);
    await page.goto('./');
    await expect(card(page).locator('.source-note--caption')).toHaveText(CAPTION_EXTRAPOLATED);
    await expect(page.locator('.strip .signal-bar')).toHaveCount(3);
    await expect(page.getByText('Outside the data window (2026–2027)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next month' })).toBeEnabled();
    await evidence(page, 'desktop-computed-2029');
    await option(page, LAYERS, 'Horizons').click();
    await expect(page.locator('.strip').getByText('Outside the data window (2026–2027)')).toBeVisible();
    await expect(card(page).locator('.source-note')).toHaveCount(0);
  });

  test('the month arrows leave the data window under Computed only', async ({ page }) => {
    await stubApi(page);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.clock.setFixedTime(new Date('2027-12-15T12:00:00Z'));
    await page.goto('./');
    const next = page.getByRole('button', { name: 'Next month' });
    await expect(next).toBeDisabled();
    await option(page, LAYERS, 'Computed').click();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.locator('.strip__month')).toHaveText('January 2028');
    await expect(card(page).locator('.source-note--caption')).toHaveText(CAPTION_EXTRAPOLATED);
  });

  // QA on PR #19: the selected marker is hollow while its state is computed, on the globe and the polar map.
  test('the selected marker is hollow under Computed, filled under Horizons, on the globe and the polar map', async ({
    page,
  }) => {
    await stubApi(page);
    await open(page);
    const markers = page.locator('.globe-markers');
    const chosen = page.locator('.globe-marker[aria-pressed="true"]');
    const fill = (el: Element) => getComputedStyle(el, '::after').backgroundColor;
    await expect(markers).toHaveAttribute('data-state', /^(window|sun|earth|none)$/);
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-computed', 'false');
    expect(await chosen.evaluate(fill)).not.toBe('rgba(0, 0, 0, 0)');
    await option(page, LAYERS, 'Computed').click();
    await expect(page.locator('section.globe')).toHaveAttribute('data-computed', 'true');
    await expect.poll(() => chosen.evaluate(fill)).toBe('rgba(0, 0, 0, 0)');
    await evidence(page, 'desktop-globe-hollow');
    await page.getByRole('link', { name: 'Polar map' }).click();
    const polar = page.locator('.polar-marker[aria-pressed="true"]');
    await expect(polar).toHaveAttribute('data-state', /^(window|sun|earth|none)$/);
    expect(await polar.evaluate(fill)).toBe('rgba(0, 0, 0, 0)');
    await evidence(page, 'desktop-polar-hollow');
    await option(page, '.polar .globe-layers', 'Horizons').click();
    await expect.poll(() => polar.evaluate(fill)).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// QA on PR #19: at 1280x720 in Spanish the Chang'e-6 marker painted over «Comparar» and took its click.
test.describe('desktop, 1280x720: floating surfaces over the markers', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  /** Whether the topmost element at the centre of the element's box is the element or inside it. */
  const onTop = (el: Element): boolean => {
    const box = el.getBoundingClientRect();
    const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top !== null && el.contains(top);
  };

  test('the Compare segment is on top of every marker and takes the click', async ({ page }) => {
    await stubApi(page);
    await open(page, 'es/');
    await expect(page.locator('.globe-marker').first()).toBeAttached();
    await page.waitForTimeout(500);
    const compare = switchIn(page, LAYERS).getByRole('radio', { name: 'Comparar' });
    for (const name of ['Calculado', 'Horizons', 'Comparar']) {
      expect(await switchIn(page, LAYERS).getByRole('radio', { name }).evaluate(onTop)).toBe(true);
    }
    const site = await page.locator('.site-button').getAttribute('aria-label');
    await compare.click();
    await expect(compare).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.site-button')).toHaveAttribute('aria-label', site!);
    await evidence(page, 'desktop-1280-es-layers');
  });

  test('no marker paints over the site card, the calendar strip or the header', async ({ page }) => {
    await stubApi(page);
    await open(page);
    await expect(page.locator('.globe-marker').first()).toBeAttached();
    await page.waitForTimeout(500);
    const covered = await page.evaluate(() => {
      const surfaces = ['.site-card', '.strip', 'header.bar'].map((s) => document.querySelector(s)!);
      const hits: string[] = [];
      for (const marker of document.querySelectorAll<HTMLElement>('.globe-marker:not([hidden])')) {
        const box = marker.getBoundingClientRect();
        const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
        for (const surface of surfaces) {
          const area = surface.getBoundingClientRect();
          if (x < area.left || x > area.right || y < area.top || y > area.bottom) continue;
          const top = document.elementFromPoint(x, y);
          if (!top || !surface.contains(top)) hits.push(marker.getAttribute('aria-label') ?? '?');
        }
      }
      return hits;
    });
    expect(covered).toEqual([]);
  });
});
