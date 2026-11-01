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
 * The sites NASA's illumination maps put in shadow (VENT-39, canvas option B), at the canvas instant, 22 November
 * 2026 20:00 UTC. Haworth sits on a permanently shadowed crater floor: a quiet note says so, and its Sun answer
 * follows the map, never up, whether the hours are computed or from Horizons. Its Earth follows the crater's terrain
 * horizon (VENT-40): the walls hide it all November, though it stands 8.5° over the smooth sphere's horizon. The
 * Cabeus B point only gets a note. On phones the half sheet rises by the note, so the four widgets keep clear of the
 * tab bar.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-22T20:00:00Z');
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-11-01';
const SUN_SOURCE = "Sun from NASA's permanent-shadow map (LRO LOLA, Mazarico 2011)";
const CAPTION = 'Computed by Ventana Lunar · approximate: elevations within 0.05° of JPL Horizons';
const PSR_BODY = "NASA's maps put this point on a crater floor the Sun never reaches.";

/** Opens `site` at the canvas instant on a data source, as if chosen on an earlier visit. */
async function open(page: Page, site: string, source: 'computed' | 'horizons' = 'computed'): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.addInitScript((kept) => {
    localStorage.setItem('ventana.dataSource', kept);
    localStorage.setItem('ventana.pinHint', 'seen');
  }, source);
  await stubApi(page);
  await page.goto(`./?site=${site}`);
}

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: new URL(`${DATE}-vent-39-${name}.png`, OUT).pathname });
}

const card = (page: Page) => page.getByRole('complementary', { name: 'Site card' });
const strip = (page: Page) => page.getByRole('region', { name: 'Calendar' });
const tile = (page: Page, label: string) =>
  card(page).locator('.card-tile').filter({ has: page.locator('.card-tile__label', { hasText: label }) });

/** The value of the card's list row `label`. */
async function fact(page: Page, label: string): Promise<string> {
  return (await card(page).locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd').textContent()) ?? '';
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Haworth, computed: the note, no Sun all month, no window, the Earth behind the crater walls', async ({ page }) => {
    await open(page, 'artemis-haworth');
    const note = card(page).getByRole('note');
    await expect(note).toHaveText(`Permanent shadow${PSR_BODY}`);
    // The point line already says «not a landing point»: the card says it once.
    await expect(card(page).getByText('approximate zone, not a landing point')).toBeVisible();
    await expect(card(page).getByText(/not a landing point/)).toHaveCount(1);
    await expect(tile(page, 'Sun')).toHaveText('SunNo SunPermanent shadow');
    expect(await fact(page, 'Hours with Sun')).toBe('0 %');
    expect(await fact(page, 'Landing window')).toBe('0 %');
    expect(await fact(page, 'Longest window')).toBe('None');
    expect(await fact(page, 'Hours with Earth')).toBe('0 %');
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-state', 'none');
    await expect(card(page).locator('.card-media__badge')).toContainText('Neither');
    await expect(strip(page).getByRole('img', { name: 'Sun: 0 % of November 2026' })).toBeVisible();
    await expect(strip(page).getByRole('img', { name: 'Window: 0 % of November 2026' })).toBeVisible();
    await expect(strip(page).getByText('No landing window this month')).toBeVisible();
    await expect(card(page).getByText(`${CAPTION} · ${SUN_SOURCE}`, { exact: true })).toBeAttached();
    await evidence(page, 'desktop-haworth');
    await card(page).locator('.site-card__scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await evidence(page, 'desktop-haworth-scrolled');
  });

  test('Haworth, Horizons: the Sun the stub puts up all month stays down, and the Sun source is cited alone', async ({ page }) => {
    // The stub's sky for any site but IM-2: Sun 3° up, Earth 1° (api-stub.ts).
    await open(page, 'artemis-haworth', 'horizons');
    await expect(card(page).getByText('November 2026 · JPL Horizons, 1 h step', { exact: false })).toBeVisible();
    expect(await fact(page, 'Hours with Sun')).toBe('0 %');
    expect(await fact(page, 'Landing window')).toBe('0 %');
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-state', 'none');
    await expect(card(page).getByText(SUN_SOURCE, { exact: true })).toBeAttached();
  });

  test('Cabeus B: a note on its little Sun, and the Sun as computed', async ({ page }) => {
    await open(page, 'artemis-peak-near-cabeus-b');
    await expect(card(page).getByRole('note')).toHaveText("Crater floor · little SunNASA's maps give this point 11 % of the Sun on average.");
    expect(await fact(page, 'Hours with Sun')).not.toBe('0 %');
    await expect(card(page).getByText(SUN_SOURCE, { exact: false })).toHaveCount(0);
    await evidence(page, 'desktop-cabeus-b');
  });

  test('an unmarked site has no note', async ({ page }) => {
    await open(page, 'im2-athena');
    await expect(card(page).getByRole('heading', { name: 'IM-2 Athena' })).toBeVisible();
    await expect(card(page).getByRole('note')).toHaveCount(0);
  });
});

const sheet = (page: Page) => page.locator('.sheet');
const widgets = (page: Page) => page.getByRole('list', { name: 'This site now' }).getByRole('listitem');
const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Views' });
// The half sheet shows 344 px at an unmarked site (src/sheet/sheet-physics.ts); the summary's gap is 12 px.
const HALF_PX = 344;
const GAP_PX = 12;

/** How far the half sheet rose over its usual place, and the note's room (its height and the gap), once at rest. */
async function liftAndNote(page: Page): Promise<{ lift: number; room: number }> {
  await expect(widgets(page)).toHaveCount(4);
  await expect(sheet(page).getByRole('note')).toBeVisible();
  await page.waitForTimeout(800);
  const height = page.viewportSize()!.height;
  const top = (await sheet(page).boundingBox())!.y;
  const note = (await sheet(page).getByRole('note').boundingBox())!.height;
  return { lift: height - HALF_PX - top, room: note + GAP_PX };
}

for (const width of [360, 390]) {
  test.describe(`phone, ${width}x844`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });

    test('Haworth: the note, neither Sun nor Earth, and the half sheet raised by the note', async ({ page }) => {
      await open(page, 'artemis-haworth');
      const note = sheet(page).getByRole('note');
      await expect(note).toHaveText(`Permanent shadow · not a landing point${PSR_BODY}`);
      await expect(widgets(page).nth(0)).toContainText('No window');
      await expect(widgets(page).nth(0)).toContainText('0 % of November');
      await expect(widgets(page).nth(1)).toHaveText('SunNo SunPermanent shadow');
      await expect(page.getByRole('button', { name: /^Change site, now Haworth .*: Neither · / })).toBeVisible();
      const { lift, room } = await liftAndNote(page);
      expect(Math.abs(lift - room)).toBeLessThanOrEqual(1);
      await evidence(page, `phone-${width}-haworth`);
    });

    test('Cabeus B: the note only, and the half sheet raised by it', async ({ page }) => {
      await open(page, 'artemis-peak-near-cabeus-b');
      await expect(sheet(page).getByRole('note')).toContainText('Crater floor · little Sun');
      await expect(widgets(page).nth(1)).not.toContainText('No Sun');
      const { lift, room } = await liftAndNote(page);
      expect(Math.abs(lift - room)).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Haworth keeps its four widgets above the tab bar, as an unmarked site does', async ({ page }) => {
    await open(page, 'artemis-haworth');
    await liftAndNote(page);
    const bottoms = await widgets(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom));
    expect(Math.max(...bottoms)).toBeLessThanOrEqual((await tabBar(page).boundingBox())!.y);
  });

  test('at 200 % text the half sheet rises by the taller note', async ({ page }) => {
    await open(page, 'artemis-haworth');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const { lift, room } = await liftAndNote(page);
    expect(room).toBeGreaterThan(100);
    expect(Math.abs(lift - room)).toBeLessThanOrEqual(1);
    await evidence(page, 'phone-390-haworth-200-text');
  });
});
