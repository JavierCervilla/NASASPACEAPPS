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
 * no tap flash), while the site search and the coordinates stay selectable; and the astronaut, a little smaller,
 * still offers a 44 px target and stands with its feet on the point.
 *
 * `CAPTURE_EVIDENCE=1` also keeps screenshots in production/qa/evidence/.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-11-01';
/** A held press, long enough for Chrome's long-press gesture (text selection, the context menu). */
const LONG_PRESS_MS = 800;
/** The smallest target a finger hits reliably (apple-design, WCAG 2.5.5). */
const MIN_TARGET_PX = 44;
/** The figure's drawn heights since VENT-38 (were 44, 84 and 56 px). */
const DOCK_FIGURE_PX = 36;
const PIN_FIGURE_PX = 46;
/** The pictures are 180 x 220. */
const ASPECT = 180 / 220;
/** A dropped point, in the address. */
const POINT = '?lat=-85.87&lon=61.34';

async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: new URL(`${DATE}-vent-38-${name}.png`, OUT).pathname });
}

async function open(page: Page, path = './'): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto(path);
  await expect(page.locator('.globe-viewport[data-status="ready"], .polar').first()).toBeVisible({ timeout: GLOBE_START_MS });
}

/** Holds a finger on the middle of `target` through Chrome's gesture pipeline, as a long press on a phone. */
async function longPress(page: Page, target: Locator): Promise<void> {
  const box = (await target.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeTapGesture', {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    duration: LONG_PRESS_MS,
    gestureSourceType: 'touch',
  });
  await cdp.detach();
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

/** Draws the figure's size and checks its target and its aspect. */
async function expectFigure(figure: Locator, height: number): Promise<void> {
  const box = (await figure.boundingBox())!;
  expect(Math.abs(box.height - height)).toBeLessThan(0.5);
  expect(Math.abs(box.width - height * ASPECT)).toBeLessThan(0.5);
}

async function expectTarget(target: Locator): Promise<void> {
  const box = (await target.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
}

test.describe('phone, 390x844: no text selection on the interface', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a long press on the title, the pill, the sheet\'s card, a widget or the dock selects nothing', async ({ page }) => {
    await open(page);
    await expect(page.locator('.widget').first()).toBeVisible();
    for (const words of [page.locator('.phone-bar__title'), page.locator('.summary__name'), page.locator('.widget__label').first()]) {
      expect(await doubleClickSelects(page, words)).toBe('');
    }
    const css = await shippedCss(page);
    expect(css).toMatch(/body\{[^}]*-webkit-touch-callout:none/);
    expect(css).toMatch(/body\{[^}]*-webkit-tap-highlight-color:transparent/);
    expect(await refusesContextMenu(page.locator('.astro-phone-dock'))).toBe(true);
    const targets = [
      page.locator('.phone-bar__title'),
      page.locator('.site-pill__name'),
      page.locator('.summary__name'),
      page.locator('.widget').first(),
      page.locator('.astro-phone-dock'),
    ];
    for (const target of targets) {
      expect(await feel(target)).toEqual({ select: 'none', highlight: 'rgba(0, 0, 0, 0)' });
      await longPress(page, target);
      expect(await selection(page)).toBe('');
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

  test('the astronaut is smaller, in its 44 px targets, docked and standing', async ({ page }) => {
    await open(page, `./${POINT}`);
    const pin = page.locator('.astro-pin');
    await expect(pin).toBeVisible();
    await evidence(page, 'phone-standing');
    await expectFigure(pin.locator('.astro-figure'), PIN_FIGURE_PX);
    await expectTarget(pin);
    await page.getByRole('button', { name: 'Astronaut on the Moon: bring it home' }).click();
    const dock = page.locator('.astro-phone-dock');
    await expect(dock).toHaveAttribute('data-status', 'home');
    await expect(dock.locator('.astro-figure__image')).toBeVisible();
    await evidence(page, 'phone-dock');
    await expectFigure(dock.locator('.astro-figure'), DOCK_FIGURE_PX);
    await expectTarget(dock);
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
    expect((await feel(point)).select).toBe('text');
    expect(await selectAll(point)).toMatch(/° S, .*° E/);
    expect(await doubleClickSelects(page, point)).not.toBe('');
  });

  test('the astronaut is smaller, in its 44 px targets, docked and standing', async ({ page }) => {
    await open(page, `./${POINT}`);
    const pin = page.locator('.astro-pin');
    await expect(pin).toBeVisible();
    await evidence(page, 'desktop-standing');
    await expectFigure(pin.locator('.astro-figure'), PIN_FIGURE_PX);
    await expectTarget(pin);
    expect(await refusesContextMenu(pin)).toBe(true);
    // The feet stand on the point: the pin's anchor, at the middle of its wider target.
    const figure = (await pin.locator('.astro-figure').boundingBox())!;
    const target = (await pin.boundingBox())!;
    expect(Math.abs(figure.x + figure.width / 2 - (target.x + target.width / 2))).toBeLessThan(0.5);
    await page.getByRole('button', { name: 'Astronaut on the Moon: bring it home' }).click();
    const well = page.locator('.astro-dock__well');
    await expect(page.locator('.astro-dock')).toHaveAttribute('data-status', 'home');
    await expect(well.locator('.astro-figure__image')).toBeVisible();
    await evidence(page, 'desktop-dock');
    await expectFigure(well.locator('.astro-figure'), DOCK_FIGURE_PX);
    await expectTarget(well);
  });
});
