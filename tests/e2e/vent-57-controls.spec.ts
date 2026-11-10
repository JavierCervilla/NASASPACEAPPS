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
 * VENT-57 part A, the variants the human chose on the VENT-56 canvas: one frosted material for what floats over the
 * Moon (C-02), one segmented control (C-16), one secondary button (C-17), «Saved» in «Save»'s pill (V-01), and Play
 * and «Now» as the calendar's grey controls (V-07). Read as computed styles and boxes, in both themes.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const GLOBE_START_MS = 20_000;
const SAVED = [{ id: '@-85.87,61.34', name: 'Rim camp', lat: -85.87, lonEast: 61.34, savedAt: 3 }];
const POINT = '?lat=-85.87&lon=61.34';

/** The dark theme's values, as tokens.css and phone.css set them. */
const DARK = { fill: 'rgba(120, 120, 128, 0.24)', text: 'rgb(242, 242, 244)', muted: 'rgb(154, 156, 166)', mark: 'rgb(99, 99, 102)' } as const;
/** The app is always dark (VENT-113): a light system shows the dark values. */
const THEME = { dark: DARK, light: DARK } as const;
type Scheme = keyof typeof THEME;

interface Opened {
  readonly scheme?: Scheme;
  readonly path?: string;
  readonly hint?: boolean;
  readonly saved?: boolean;
  readonly status?: number;
}

async function open(page: Page, { scheme = 'dark', path = './', hint = false, saved = false, status }: Opened = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme });
  await page.clock.setFixedTime(NOW);
  await stubApi(page, status === undefined ? {} : { status });
  await page.addInitScript(({ hint, kept }) => {
    if (!hint) localStorage.setItem('ventana.pinHint', 'seen');
    if (kept) localStorage.setItem('ventana.savedSites', kept);
  }, { hint, kept: saved ? JSON.stringify({ v: 1, sites: SAVED }) : '' });
  await page.goto(path);
  await expect(page.locator('.globe-viewport[data-status="ready"]:visible').first()).toBeVisible({ timeout: GLOBE_START_MS });
}

const style = (locator: Locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      background: s.backgroundColor, color: s.color, backdrop: s.backdropFilter, shadow: s.boxShadow,
      radius: parseFloat(s.borderTopLeftRadius), weight: s.fontWeight, underline: s.textDecorationLine,
    };
  });
const height = async (locator: Locator) => (await locator.boundingBox())!.height;

/** A grey pill fully rounded, 44 px tall, weight 600, never underlined (C-17). */
async function expectSecondary(button: Locator, scheme: Scheme): Promise<void> {
  const s = await style(button);
  expect(await height(button)).toBeGreaterThanOrEqual(44);
  expect(s.radius).toBeGreaterThanOrEqual((await height(button)) / 2);
  expect(s.background).toBe(THEME[scheme].fill);
  expect(s.weight).toBe('600');
  expect(s.underline).toBe('none');
}

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`desktop 1440x900, ${scheme} system`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('the compass, the Layers key and the carried pin\'s readout wear the hint\'s frosted material, never Liquid (C-02)', async ({ page }) => {
      await open(page, { scheme, hint: true, path: './?glass=liquid' });
      await expect(page.locator('html')).toHaveAttribute('data-glass', 'liquid');
      await page.getByRole('button', { name: 'Drop a pin' }).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.pin-carry')).toHaveAttribute('data-mode', 'keys');
      const hint = await style(page.locator('.globe .pin-hint'));
      expect(hint.backdrop).toBe('blur(20px)');
      for (const selector of ['.globe .compass', '.globe .globe-layers', '.pin-carry .pin-readout']) {
        const floater = await style(page.locator(selector));
        expect(floater.backdrop, selector).toBe('blur(20px)');
        expect(floater.background, selector).toBe(hint.background);
        expect(floater.shadow, selector).toBe(hint.shadow);
      }
    });

    test('the view tabs, the picker\'s regions and the data source are one segmented control (C-16)', async ({ page }) => {
      await open(page, { scheme });
      const { mark, text } = THEME[scheme];
      const tabs = page.locator('.views');
      expect(await height(tabs)).toBe(44);
      expect((await style(tabs)).radius).toBe(12);
      const current = await style(tabs.locator('[aria-current="page"]'));
      expect(current.background).toBe(mark);
      expect(current.radius).toBe(10);
      expect(current.shadow).toBe('none');
      expect((await style(tabs.locator(':not([aria-current="page"])').first())).color).toBe(text);
      const source = page.locator('.globe .globe-layers .source-switch');
      expect(await height(source)).toBe(44);
      expect((await style(source.locator('[aria-checked="true"]'))).background).toBe(mark);
      await page.locator('.site-button').click();
      const regions = page.locator('.site-popover .segmented').first();
      await expect(regions).toBeVisible();
      expect(await height(regions)).toBe(44);
      const pressed = await style(regions.locator('button[aria-pressed="true"]'));
      expect(pressed.background).toBe(mark);
      expect(pressed.color).toBe(text);
      // Only the chosen segment wears the mark: the others show the track, not the browser's button face.
      const offMark = [
        regions.locator('button[aria-pressed="false"]').first(),
        source.locator('[aria-checked="false"]').first(),
        tabs.locator(':not([aria-current="page"])').first(),
      ];
      for (const segment of offMark) expect((await style(segment)).background).toBe('rgba(0, 0, 0, 0)');
    });

    test('Play is a grey circle like the arrows, «Now» the secondary button, dimmed while live (V-07, C-17)', async ({ page }) => {
      await open(page, { scheme });
      const strip = page.getByRole('region', { name: 'Calendar' });
      const play = await style(strip.getByRole('button', { name: 'Play' }));
      const arrow = await style(strip.getByRole('button', { name: 'Next month' }));
      expect(play.background).toBe(arrow.background);
      expect(play.color).toBe(THEME[scheme].text);
      const now = strip.getByRole('button', { name: 'Now' });
      await expect(now).toBeDisabled();
      await expectSecondary(now, scheme);
      expect((await style(now)).color).toBe(THEME[scheme].muted);
      await strip.getByRole('slider', { name: 'Selected hour' }).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(now).toBeEnabled();
      expect((await style(now)).color).toBe(THEME[scheme].text);
    });

    test('«Try again» under «Horizons unavailable» is the secondary button, not a link (C-17)', async ({ page }) => {
      await open(page, { scheme, status: 500 });
      const retry = page.locator('.site-card .source-note__retry');
      await expect(retry).toBeVisible();
      await expectSecondary(retry, scheme);
      expect((await style(retry)).color).toBe(THEME[scheme].text);
    });

    test('«Saved» keeps «Save»\'s grey pill in the card head (V-01)', async ({ page }) => {
      await open(page, { scheme, saved: true, path: `./${POINT}` });
      const save = page.locator('.site-card .card-head .save-button');
      await expect(save).toHaveAttribute('data-saved', 'true');
      await expect(save).toContainText('Saved');
      const s = await style(save);
      expect(s.background).toBe(THEME[scheme].fill);
      expect(s.color).toBe(THEME[scheme].text);
    });
  });
}

test.describe('phone 390x844, dark', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the compass wears the hint\'s phone material (C-02)', async ({ page }) => {
    await open(page, { hint: true, path: './?glass=liquid' });
    const hint = await style(page.locator('.pin-hint'));
    const compass = await style(page.locator('.compass'));
    expect(compass.background).toBe(hint.background);
    expect(compass.shadow).toBe(hint.shadow);
    expect(compass.backdrop).toBe('blur(20px)');
  });

  test('the Sites sheet\'s segments are 40 px in a 44 px control, and the tab bar keeps its own look (C-16)', async ({ page }) => {
    await open(page);
    const tabBar = page.getByRole('navigation', { name: 'Views' });
    const before = await style(tabBar.locator('[aria-current="true"]'));
    await tabBar.getByRole('button', { name: 'Sites' }).click();
    const control = page.locator('.picker .segmented').first();
    await expect(control).toBeVisible();
    expect(await height(control)).toBe(44);
    const apollo = page.getByRole('button', { name: 'Apollo', exact: true });
    expect(await height(apollo)).toBe(40);
    await apollo.click();
    await expect(apollo).toHaveAttribute('aria-pressed', 'true');
    expect((await style(apollo)).background).toBe(THEME.dark.mark);
    expect((await style(tabBar.locator('[aria-current="true"]'))).radius).toBe(before.radius);
  });

  test('«Saved» keeps the grey pill in the sheet head; Play and «Now» in the Calendar sheet (V-01, V-07)', async ({ page }) => {
    await open(page, { saved: true, path: `./${POINT}` });
    const save = page.locator('.summary__head .save-button');
    await expect(save).toHaveAttribute('data-saved', 'true');
    expect((await style(save)).background).toBe(THEME.dark.fill);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar' }).click();
    const sheet = page.locator('.calendar');
    const play = await style(sheet.getByRole('button', { name: 'Play' }));
    expect(play.background).toBe((await style(sheet.getByRole('button', { name: 'Next month' }))).background);
    expect(play.color).toBe(THEME.dark.text);
    await expectSecondary(sheet.getByRole('button', { name: 'Now' }), 'dark');
  });
});
