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
 * The app feel (VENT-38): a long press on the interface selects no text (no Android search panel, no iOS callout,
 * no tap flash), while the site search and the coordinates stay selectable; and the pin that picks a point (VENT-37,
 * which replaced the astronaut) still offers a 44 px target with its centre on the point.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
/** The smallest target a finger hits reliably (apple-design, WCAG 2.5.5). */
const MIN_TARGET_PX = 44;
/** A dropped point, in the address. */
const POINT = '?lat=-85.87&lon=61.34';


async function open(page: Page, path = './'): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto(path);
  await expect(page.locator('.globe-viewport[data-status="ready"], .polar').first()).toBeVisible({ timeout: GLOBE_START_MS });
}

const selection = (page: Page) => page.evaluate(() => window.getSelection()?.toString() ?? '');

/** The computed selection and tap highlight of `target`. */
const feel = (target: Locator) =>
  target.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      select: style.userSelect || style.getPropertyValue('-webkit-user-select'),
      highlight: style.getPropertyValue('-webkit-tap-highlight-color'),
    };
  });

/**
 * The shipped style sheets' text. Chromium drops `-webkit-touch-callout` (iOS only) while parsing, so neither the
 * computed style nor the CSSOM can show it: the source is what Safari reads.
 */
const shippedCss = (page: Page) =>
  page.evaluate(async () => {
    const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
    const inline = [...document.querySelectorAll('style')].map((el) => el.textContent ?? '');
    const fetched = await Promise.all(links.map(async (link) => (await fetch(link.href)).text()));
    return [...inline, ...fetched].join('\n').replace(/\s+/g, '');
  });

/**
 * The declarations of the shipped rule whose selector is exactly `selector` (a regular expression source), as Safari
 * reads them: Chromium keeps inputs selectable on its own, iOS inherits `-webkit-user-select: none` from the body.
 */
function ruleOf(css: string, selector: string): string {
  return new RegExp(`(?:^|[}\\n])${selector}\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

/** What keeps text selectable on iOS Safari and everywhere else. */
const SELECTABLE = [/(^|;)-webkit-user-select:text(;|$)/, /(^|;)user-select:text(;|$)/];

function expectSelectable(css: string, selector: string): void {
  const rule = ruleOf(css, selector);
  for (const declaration of SELECTABLE) expect(rule, selector).toMatch(declaration);
}

/** No picture starts a native drag: the attribute, and the WebKit rule for what has none. */
async function expectNotDraggable(page: Page, images: Locator): Promise<void> {
  await expect(images.first()).toBeAttached();
  for (const image of await images.all()) await expect(image).toHaveAttribute('draggable', 'false');
  expect(ruleOf(await shippedCss(page), 'img')).toMatch(/(^|;)-webkit-user-drag:none(;|$)/);
}

/** A double click selects a word wherever text is selectable: what a long press does on a phone. */
async function doubleClickSelects(page: Page, target: Locator): Promise<string> {
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const box = (await target.boundingBox())!;
  await page.mouse.dblclick(box.x + Math.min(20, box.width / 2), box.y + box.height / 2);
  return selection(page);
}

/** Whether a context menu asked for on `target` is refused. */
const refusesContextMenu = (target: Locator) =>
  target.evaluate((el) => !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));

/** Selects the whole text of `target` as a script would; what the rules allow stays selected. */
const selectAll = (target: Locator) =>
  target.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const chosen = window.getSelection()!;
    chosen.removeAllRanges();
    chosen.addRange(range);
    return chosen.toString();
  });

/** The pin's mark (ring and dot) sits at the middle of its target: the point. */
async function expectCentred(pin: Locator): Promise<void> {
  await expect.poll(async () => {
    const mark = (await pin.locator('.pin__mark').boundingBox())!;
    const target = (await pin.boundingBox())!;
    return Math.max(
      Math.abs(mark.x + mark.width / 2 - (target.x + target.width / 2)),
      Math.abs(mark.y + mark.height / 2 - (target.y + target.height / 2)),
    );
  }).toBeLessThan(0.5);
}

async function expectTarget(target: Locator): Promise<void> {
  const box = (await target.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
}

test.describe('phone, 390x844: no text selection on the interface', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the title, the pill, the sheet\'s card, a widget and the pin refuse text selection', async ({ page }) => {
    await open(page, `./${POINT}`);
    await expect(page.locator('.widget').first()).toBeVisible();
    for (const words of [page.locator('.phone-bar__title'), page.locator('.summary__name'), page.locator('.widget__label').first()]) {
      expect(await doubleClickSelects(page, words)).toBe('');
    }
    const css = await shippedCss(page);
    expect(css).toMatch(/body\{[^}]*-webkit-touch-callout:none/);
    expect(css).toMatch(/body\{[^}]*-webkit-tap-highlight-color:transparent/);
    expect(await refusesContextMenu(page.locator('.pin'))).toBe(true);
    const targets = [
      page.locator('.phone-bar__title'),
      page.locator('.site-pill__name'),
      page.locator('.summary__name'),
      page.locator('.widget').first(),
      page.locator('.pin'),
    ];
    for (const target of targets) {
      expect(await feel(target)).toEqual({ select: 'none', highlight: 'rgba(0, 0, 0, 0)' });
    }
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'half');
  });

  test('the coordinates and the site search stay selectable', async ({ page }) => {
    await open(page);
    const coords = page.locator('.summary__coords');
    expect((await feel(coords)).select).toBe('text');
    expect(await selectAll(coords)).toMatch(/° S, .*° E/);
    expect(await selectAll(page.locator('.phone-bar__title'))).toBe('');
    await page.getByRole('button', { name: /^Change site, now / }).click();
    const search = page.getByRole('searchbox', { name: 'Search a site or mission' });
    await search.fill('mouton');
    expect((await feel(search)).select).toBe('text');
    expect(await search.evaluate((el: HTMLInputElement) => (el.select(), el.selectionEnd! - el.selectionStart!))).toBe(6);
  });

  test('the shipped CSS keeps text fields and the coordinates selectable for iOS Safari', async ({ page }) => {
    await open(page);
    const css = await shippedCss(page);
    expectSelectable(css, String.raw`input:not\(\[type=['"]?range['"]?\]\),textarea`);
    expectSelectable(css, String.raw`\.summary__coords`);
    expectSelectable(css, String.raw`\.card-head__coords`);
  });

  test('the site thumbnail is not draggable', async ({ page }) => {
    await open(page);
    await expectNotDraggable(page, page.locator('.summary__thumb img, img.summary__thumb'));
  });

  test('the pin keeps its 44 px target, its centre on the point', async ({ page }) => {
    await open(page, `./${POINT}`);
    const pin = page.locator('.pin');
    await expect(pin).toBeVisible();
    await expectTarget(pin);
    await expectCentred(pin);
  });
});

test.describe('desktop, 1440x900: no text selection on the interface', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the chrome is not selectable, the coordinates on the card are', async ({ page }) => {
    await open(page);
    const card = page.getByRole('complementary', { name: 'Site card' });
    await expect(card.locator('.card-head__name')).toBeVisible();
    for (const target of [page.locator('h1.title'), card.locator('.card-head__name'), card.locator('.card-tile').first()]) {
      expect((await feel(target)).select).toBe('none');
      expect(await selectAll(target)).toBe('');
      expect(await doubleClickSelects(page, target)).toBe('');
    }
    const point = card.locator('.card-head__point');
    const coords = point.locator('.card-head__coords');
    expect((await feel(coords)).select).toBe('text');
    expect((await feel(point)).select).toBe('none');
    // Selecting the whole line keeps only the numbers: «· exact touchdown» stays out of a copy.
    expect(await selectAll(point)).toMatch(/^\d+\.\d+° S, \d+\.\d+° E$/);
    expect(await doubleClickSelects(page, coords)).not.toBe('');
  });

  test('the card\'s thumbnail and the polar map are not draggable', async ({ page }) => {
    await open(page);
    await expectNotDraggable(page, page.getByRole('complementary', { name: 'Site card' }).locator('img'));
    await page.goto('./#polar-map');
    await expect(page.locator('.polar__image')).toBeVisible({ timeout: GLOBE_START_MS });
    await expectNotDraggable(page, page.locator('.polar__image'));
  });

  test('the pin keeps its 44 px target, its centre on the point, and refuses the menu', async ({ page }) => {
    await open(page, `./${POINT}`);
    const pin = page.locator('.pin');
    await expect(pin).toBeVisible();
    await expectTarget(pin);
    await expectCentred(pin);
    expect(await refusesContextMenu(pin)).toBe(true);
  });
});
