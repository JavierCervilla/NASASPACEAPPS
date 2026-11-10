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
 * Colour, focus and type in the browser (VENT-55, findings C-08, C-09, C-11 and C-12 of VENT-53): the focus ring is
 * the text colour on the page's surfaces whatever the system theme, small text tracks a little looser and large text
 * tighter, reduced transparency keeps the pin hint readable, and more contrast makes the chrome opaque. The app is
 * always dark (VENT-113): a light system changes nothing.
 * Screenshots go to E2E_SHOTS when it is set.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const SHOTS = process.env.E2E_SHOTS;

async function open(page: Page, status = 200): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page, { status });
  await page.goto('./');
}

/** Asks Chromium for prefers-reduced-transparency: reduce, which emulateMedia does not offer. */
async function reduceTransparency(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
}

async function shoot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** The ring a focused control draws, and the text colour of the page. */
async function ringOf(control: Locator): Promise<{ style: string; colour: string; text: string }> {
  return control.evaluate((el) => {
    const ring = getComputedStyle(el);
    return { style: ring.outlineStyle, colour: ring.outlineColor, text: getComputedStyle(document.body).color };
  });
}

/** Focuses `control` as the keyboard does, so `:focus-visible` holds. */
async function keyboardFocus(page: Page, control: Locator): Promise<void> {
  await page.keyboard.press('Tab');
  await control.focus();
}

/** Every visible text's size and its tracking in em, by element. */
function trackingBySize(): { size: number; tracking: number; what: string }[] {
  const out: { size: number; tracking: number; what: string }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    const ownText = [...el.childNodes].some((node) => node.nodeType === 3 && (node.textContent ?? '').trim());
    if (!ownText || el.getClientRects().length === 0 || el.closest('.visually-hidden')) continue;
    const style = getComputedStyle(el);
    const size = Number.parseFloat(style.fontSize);
    const spacing = style.letterSpacing === 'normal' ? 0 : Number.parseFloat(style.letterSpacing);
    out.push({ size, tracking: Math.round((spacing / size) * 10000) / 10000, what: `${el.className} «${el.textContent?.trim().slice(0, 24)}»` });
  }
  return out;
}

/** Small text (12 px and under) never tracks tighter than 0, large text (17 px and over) always does. */
async function expectSizeSpecificTracking(page: Page): Promise<void> {
  const texts = await page.evaluate(trackingBySize);
  expect(texts.length).toBeGreaterThan(10);
  expect(texts.filter((t) => t.size <= 12 && t.tracking < 0).map((t) => t.what)).toEqual([]);
  expect(texts.filter((t) => t.size >= 17 && t.tracking >= 0).map((t) => t.what)).toEqual([]);
}

const ALPHA = /rgba\([^)]*,\s*([\d.]+)\)/;
const alphaOf = (colour: string): number => Number(ALPHA.exec(colour)?.[1] ?? 1);

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const scheme of ['dark', 'light'] as const) {
    test(`the focus ring is the text colour on the page's surfaces (${scheme} system)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, 500);
      const controls = [
        page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Polar map' }),
        page.getByRole('switch', { name: /Landing sites/ }),
        page.getByRole('button', { name: 'Drop a pin' }),
        page.getByRole('complementary', { name: 'Site card' }).getByRole('button', { name: 'Try again' }),
      ];
      for (const control of controls) {
        await keyboardFocus(page, control);
        const ring = await ringOf(control);
        expect(ring.style).toBe('solid');
        expect(ring.colour).toBe(ring.text);
      }
      await keyboardFocus(page, controls[1] as Locator);
      await shoot(page, `focus-layers-${scheme}`);
    });
  }

  test('small text tracks at 0 or looser, large text tighter, on the globe, the polar map and the DSN view', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('complementary', { name: 'Site card' }).getByRole('heading', { name: 'IM-2 Athena' })).toBeVisible();
    await expectSizeSpecificTracking(page);
    for (const view of ['Polar map', 'DSN']) {
      await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: view }).click();
      await expectSizeSpecificTracking(page);
    }
  });

  test('a light system leaves the app dark: the page, its colour scheme and the browser\'s theme colour', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const root = await page.evaluate(() => ({
      scheme: getComputedStyle(document.documentElement).colorScheme,
      bg: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
    }));
    expect(root).toEqual({ scheme: 'dark', bg: 'rgb(7, 8, 11)', text: 'rgb(242, 242, 244)' });
    const themes = page.locator('meta[name="theme-color"]');
    await expect(themes).toHaveCount(1);
    await expect(themes).toHaveAttribute('content', '#07080b');
    expect(await themes.getAttribute('media')).toBeNull();
    await shoot(page, 'light-system-stays-dark');
  });

  test('a light system with reduced transparency keeps the pin hint on the opaque dark surface', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await reduceTransparency(page);
    await open(page);
    const hint = page.locator('.pin-hint').first();
    await expect(hint).toBeVisible();
    const look = await hint.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, text: getComputedStyle(el).color }));
    expect(look.bg).toBe('rgb(21, 22, 27)');
    expect(look.text).toBe('rgb(242, 242, 244)');
    await shoot(page, 'light-system-reduced-transparency');
  });

  test('more contrast: the header is opaque and the language menu has its border', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await open(page);
    expect(alphaOf(await page.locator('.bar').evaluate((el) => getComputedStyle(el).backgroundColor))).toBeGreaterThanOrEqual(0.94);
    await page.locator('.lang-button').click();
    const border = await page.locator('.lang-popover').evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(border).toBe('solid');
    await shoot(page, 'more-contrast-desktop');
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('small text tracks at 0 or looser, large text tighter, in the sheet and the calendar', async ({ page }) => {
    await open(page);
    await expect(page.locator('.summary__name')).toBeVisible();
    await expectSizeSpecificTracking(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('aria-label', 'Calendar');
    await expectSizeSpecificTracking(page);
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`more contrast: the bar, the sheet and the tab bar are opaque (${scheme} system)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, contrast: 'more' });
      await open(page);
      await expect(page.locator('.summary__name')).toBeVisible();
      for (const surface of ['.phone-bar', '.sheet', '.tab-bar']) {
        const bg = await page.locator(surface).first().evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(alphaOf(bg), surface).toBeGreaterThanOrEqual(0.94);
      }
      await shoot(page, `more-contrast-phone-${scheme}`);
    });
  }
});
