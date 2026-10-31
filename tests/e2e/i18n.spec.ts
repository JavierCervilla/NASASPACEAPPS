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
 * The interface in five languages (VENT-35): every locale route says its language and links the others; the language
 * selector, on the desktop header and in the phone's Sites sheet, switches the locale, keeps the view and is kept for
 * the next visit; the first visit to `/` opens the browser's language once, and an explicit locale URL is never
 * redirected; nothing is cut or scrolls sideways in German or in the pseudo-locale (about 40 % longer); and the
 * production CSP lets every locale page run without a violation, the first-visit script included.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-29T20:00:00Z');
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const ROUTES = [
  ['', 'en'],
  ['es/', 'es'],
  ['fr/', 'fr'],
  ['de/', 'de'],
  ['it/', 'it'],
] as const;
const base = (process.env.SITE_BASE ?? '/').replace(/\/?$/, '/');

/** Opens `path` at a fixed instant with the API stubbed, once the globe shows IM-2's state. */
async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto(`./${path}`);
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
}

/** The path part of the page's URL under the base: `es/` for /es/. */
const pathOf = (page: Page) => new URL(page.url()).pathname.slice(base.length);

test.describe('locale routes', () => {
  for (const [path, lang] of ROUTES) {
    test(`/${path} is in ${lang}, and links every locale and x-default`, async ({ page }) => {
      await page.goto(`./${path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      const links = page.locator('link[rel="alternate"][hreflang]');
      const pairs = await links.evaluateAll((els) => els.map((el) => [el.getAttribute('hreflang'), el.getAttribute('href')]));
      expect(pairs).toEqual([
        ['en', base],
        ['es', `${base}es/`],
        ['fr', `${base}fr/`],
        ['de', `${base}de/`],
        ['it', `${base}it/`],
        ['x-default', base],
      ]);
      expect(await page.title()).toMatch(/^Ventana Lunar · /);
    });
  }

  test('the pseudo-locale page is never indexed nor linked', async ({ page }) => {
    await page.goto('./en-xa/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    expect(await page.locator('link[hreflang="en-XA"], link[hreflang="en-xa"]').count()).toBe(0);
  });

  test('the island speaks the page’s language: Spanish widgets, decimal commas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'es/');
    await expect(page.locator('.phone-bar__rule')).toHaveText('Sol + Tierra = ventana');
    await expect(page.getByRole('list', { name: 'Este lugar ahora' })).toBeVisible();
    await expect(page.locator('.summary__coords')).toHaveText('84,79° S, 29,20° E');
    // Site names: the proper names stay, the words around them are Spanish (QA PR #17).
    await page.getByRole('navigation', { name: 'Vistas' }).getByRole('button', { name: 'Lugares' }).click();
    const list = page.getByRole('list', { name: 'Lugares' });
    await expect(list.getByRole('button', { name: /^Región de Malapert A/ })).toBeVisible();
    await expect(list).toContainText('región candidata de Artemis');
    await expect(list).not.toContainText(/candidate region|planned site|crater area|north of/);
  });
});

test.describe('desktop language menu, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('opens on the current language, moves with the arrows, closes with Escape back on its button', async ({ page }) => {
    await open(page, '');
    const button = page.getByRole('button', { name: 'Language: English' });
    await expect(button).toHaveText('EN');
    await button.click();
    const menu = page.getByRole('menu', { name: 'Language' });
    await expect(menu).toBeVisible();
    const items = menu.getByRole('menuitemradio');
    await expect(items).toHaveCount(5);
    await expect(items.nth(0)).toBeFocused();
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(items.nth(1)).toHaveText(/^Español\s*Spanish$/);
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.nth(4)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('switches to Spanish on the same view, and the choice outlives a reload and a visit to /', async ({ page }) => {
    await open(page, '#polar-map');
    await page.getByRole('button', { name: 'Language: English' }).click();
    await page.getByRole('menuitemradio', { name: /^Español/ }).click();
    await expect(page).toHaveURL(/\/es\/#polar-map$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('region', { name: 'Mapa del polo sur, de 80 a 90 grados sur' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.goto('./#globe');
    await expect(page).toHaveURL(/\/es\/#globe$/);
    await page.getByRole('button', { name: 'Idioma: Español' }).click();
    await expect(page.getByRole('menuitemradio', { name: /^Español/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('menuitemradio', { name: /^English/ }).click();
    await expect(page).toHaveURL(new RegExp(`${base}#globe$`));
    await page.goto('./');
    expect(pathOf(page)).toBe('');
  });
});

test.describe('phone language list, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the Sites sheet’s Language row pushes the list; Back and Escape bring the focus home', async ({ page }) => {
    await open(page, '');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    const row = page.getByRole('button', { name: /^Language\s*English/ });
    await expect(row).toBeVisible();
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await row.click();
    const menu = page.getByRole('menu', { name: 'Language' });
    await expect(menu.getByRole('menuitemradio', { name: /^English/ })).toBeFocused();
    for (const item of await menu.getByRole('menuitemradio').all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(row).toBeFocused();
    await expect(menu).toHaveCount(0);
    await row.click();
    await page.keyboard.press('Escape');
    await expect(row).toBeFocused();
    await row.click();
    await menu.getByRole('menuitemradio', { name: /^Deutsch/ }).click();
    await expect(page).toHaveURL(/\/de\/$/);
    await expect(page.getByRole('navigation', { name: 'Ansichten' })).toBeVisible();
  });
});

/** Whether the boxes of `a` and `b` overlap. */
const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe('phone language list with motion on, 390x844 (QA PR #17)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the push settles with the list alone on screen, and Back brings the sites back alone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await page.goto('./de/');
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    await page.locator('.tab-bar .tab').last().click();
    await page.locator('.lang-row').click();
    // Wait for the spring to report rest, not for a fixed time: a busy CI
    // runner draws fewer frames, so a fixed sleep raced the settle.
    await expect(page.locator('.push')).toHaveAttribute('data-at', 'page', { timeout: 5000 });
    await expect(page.locator('.picker__title')).toBeHidden({ timeout: 100 });
    await expect(page.getByRole('list', { name: 'Landeplätze' })).toBeHidden();
    const back = (await page.locator('.lang-page__back').boundingBox())!;
    const title = (await page.locator('.lang-page__title').boundingBox())!;
    expect(overlap(back, title)).toBe(false);
    expect(await page.locator('.push__page').evaluate((el) => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0);
    await page.locator('.lang-page__back').click();
    await expect(page.locator('.push')).toHaveAttribute('data-at', 'root', { timeout: 3000 });
    await expect(page.locator('.picker__title')).toBeVisible();
    await expect(page.locator('.lang-list')).toHaveCount(0);
    const done = (await page.locator('.picker__done').boundingBox())!;
    expect(overlap((await page.locator('.picker__title').boundingBox())!, done)).toBe(false);
  });
});

test.describe('first visit to /, browser in Spanish', () => {
  test.use({ locale: 'es-ES' });

  test('opens /es/ once, keeping the view; the next visit to / stays', async ({ page }) => {
    await page.goto('./#polar-map');
    await expect(page).toHaveURL(/\/es\/#polar-map$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('an explicit /fr/ is never redirected', async ({ page }) => {
    await page.goto('./fr/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect(pathOf(page)).toBe('fr/');
  });
});

/** Whether every element of `selector` draws all its text: nothing scrolled out, no ellipsis. */
const allWhole = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) =>
    els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className || el.tagName),
  );

/** The elements of `selector` reaching past the viewport's sides. */
const outside = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) =>
    els.filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && (box.left < -0.5 || box.right > innerWidth + 0.5);
    }).map((el) => el.className || el.tagName),
  );

for (const [path, name] of [['de/', 'German'], ['fr/', 'French'], ['en-xa/', 'the pseudo-locale']] as const) {
  for (const [width, height] of [[320, 640], [360, 780], [390, 844]] as const) {
    test.describe(`phone, ${width}x${height}, ${name}: nothing cut`, () => {
      test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

      test('the pill keeps its time left whole, the tab bar and the sheet fit, nothing scrolls sideways', async ({ page }) => {
        await open(page, path);
        await expect.poll(() => allWhole(page, '.site-pill__state .fit-line__shown')).toEqual([]);
        await expect(page.locator('.site-pill__state .fit-line__shown')).toHaveText(/\d/);
        expect(await allWhole(page, '.phone-bar__title, .phone-bar__rule, .site-pill__name')).toEqual([]);
        expect(await outside(page, '.phone-bar, .site-pill, .tab-bar, .tab, .sheet .widget')).toEqual([]);
        expect(await allWhole(page, '.tab > span:not(.tab__soon)')).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByRole('navigation').locator('.tab').last().click();
        await expect(page.locator('.lang-row')).toBeVisible();
        expect(await outside(page, '.lang-row, .lang-row__value, .picker__done, .segmented')).toEqual([]);
        expect(await allWhole(page, '.segmented button')).toEqual([]);
        // The search field's placeholder is drawn whole, never cut mid-word (QA PR #17).
        expect(await page.locator('.search input').evaluate((input: HTMLInputElement) => {
          const style = getComputedStyle(input);
          const context = document.createElement('canvas').getContext('2d')!;
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          return context.measureText(input.placeholder).width <= room;
        })).toBe(true);
      });
    });
  }

  for (const [width, height] of [[1280, 720], [1440, 900]] as const) {
    test.describe(`desktop, ${width}x${height}, ${name}: nothing cut`, () => {
      test.use({ viewport: { width, height } });

      test('the header, the site card and the calendar strip fit, and nothing scrolls sideways', async ({ page }) => {
        await open(page, path);
        await expect(page.locator('.lang-button')).toBeVisible();
        expect(await outside(page, '.bar, .bar > *, .views > *, .lang-button, .site-button, .site-card, .strip')).toEqual([]);
        expect(await allWhole(page, '.views > *, .lang-button, .site-card__scroll, .card-tile, .strip, .strip__head, .strip__legend')).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.locator('.lang-button').click();
        expect(await outside(page, '.lang-popover')).toEqual([]);
        expect(await allWhole(page, '.lang-option')).toEqual([]);
      });
    });
  }
}

/** The CSP nginx sends for the built site (packages/web/scripts/csp-header.mjs, as the Dockerfile runs it). */
function builtPolicy(): string {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  return /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
}

/** Serves every page with the production CSP and records each violation. */
async function underPolicy(page: Page): Promise<string> {
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
  return policy;
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { violations: string[] }).violations);

test.describe('the production CSP on every locale page', () => {
  for (const [path, lang] of [...ROUTES, ['en-xa/', 'en-XA']] as const) {
    for (const [device, viewport, isMobile] of [
      ['desktop', { width: 1440, height: 900 }, false],
      ['phone', { width: 390, height: 844 }, true],
    ] as const) {
      test(`/${path}, ${device}: no violation`, async ({ browser }) => {
        const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
        const page = await context.newPage();
        expect(await underPolicy(page)).toContain("style-src-attr 'none'");
        await open(page, path);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        if (device === 'desktop') await page.locator('.lang-button').click();
        await page.waitForTimeout(800);
        expect(await violations(page)).toEqual([]);
        await context.close();
      });
    }
  }

  test.describe('browser in Spanish', () => {
    test.use({ locale: 'es-ES' });

    test('the first-visit script runs under the policy and opens /es/', async ({ page }) => {
      await underPolicy(page);
      await page.goto('./');
      await expect(page).toHaveURL(/\/es\/$/);
      await page.waitForTimeout(500);
      expect(await violations(page)).toEqual([]);
    });
  });
});
