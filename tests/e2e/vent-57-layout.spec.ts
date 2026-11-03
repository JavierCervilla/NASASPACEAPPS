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
 * VENT-57 part C, the layouts the human chose on the VENT-56 canvas: the compact desktop card (V-04, variant C: the
 * relief as a 96 px band, the horizon strip and the DSN folded into one block, the Horizons-down note under the
 * figures, in view without scrolling at 1440x900) and the phone Sites sheet that starts with the list (V-12, variant
 * C: the Layers group, the «Language» row and the «Data source» switch on a «Settings» page behind a gear next to
 * «Done»).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const CANVAS = new Date('2026-11-22T20:00:00Z');
const SHOTS = process.env.VENT57_SHOTS;
const SAVE_HINT = 'Drop a pin on the Moon and tap Save to keep a site here';

/** Opens `path` at the canvas instant, dark, the hint seen, the site route answering `status`. */
async function open(page: Page, path = './', status = 200): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(CANVAS);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page, { status });
  await page.goto(path);
}

async function shot(page: Page, name: string, target?: Locator): Promise<void> {
  if (!SHOTS) return;
  await page.waitForTimeout(300);
  await (target ?? page).screenshot({ path: `${SHOTS}/${name}.png` });
}

type Box = { x: number; y: number; width: number; height: number };

/** The elements of `selector` inside `root` whose text is cut: scrolled out sideways or below. */
const clipped = (root: Locator, selector: string) =>
  root.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
      .map((el) => el.className),
  );

test.describe('desktop, 1440x900, Horizons down: the compact card (V-04 C)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  const card = (page: Page) => page.getByRole('complementary', { name: 'Site card' });
  const scroller = (page: Page) => card(page).locator('.site-card__scroll');
  const region = (page: Page) => page.getByRole('region', { name: 'Listening on Earth' });
  const listening = (page: Page) => card(page).locator('.card-block').getByRole('region', { name: 'Listening on Earth' });

  test('the Horizons note sits under the figures, in view without scrolling', async ({ page }) => {
    await open(page, './?site=im2-athena', 500);
    const note = card(page).getByRole('status');
    await expect(note).toContainText('Horizons unavailable: showing the computed sky');
    const retry = card(page).getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible();
    expect(await scroller(page).evaluate((el) => el.scrollTop)).toBe(0);
    const room = (await scroller(page).boundingBox())!;
    const fade = 24;
    for (const box of [(await note.boundingBox())!, (await retry.boundingBox())!]) {
      expect(box.y).toBeGreaterThanOrEqual(room.y);
      expect(box.y + box.height).toBeLessThanOrEqual(room.y + room.height - fade);
    }
    // Under the two tiles, over the horizon strip.
    const tiles = (await card(page).locator('.card-tiles').boundingBox())!;
    const strip = (await card(page).locator('.horizon--card').boundingBox())!;
    const box = (await note.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(tiles.y + tiles.height);
    expect(box.y + box.height).toBeLessThanOrEqual(strip.y);
    // The relief is the 96 px band.
    expect(Math.round((await card(page).locator('.card-media').boundingBox())!.height)).toBe(96);
    await shot(page, 'after-v04-card', card(page));
    await shot(page, 'after-v04-context');
  });

  test('one block holds the horizon strip and the DSN, the DSN on one row beside the small Earth', async ({ page }) => {
    await open(page, './?site=im2-athena', 500);
    await expect(listening(page)).toContainText('Robledo');
    const folded = card(page).locator('.card-block').filter({ has: page.locator('.horizon--card') }).filter({
      has: region(page),
    });
    await expect(folded).toHaveCount(1);
    // Every datum the block had stays: nothing dropped, only folded.
    await expect(listening(page)).toContainText('Listening on Earth');
    await expect(listening(page)).toContainText('Madrid · Moon at 52°');
    await expect(listening(page)).toContainText('~6 h left');
    await expect(listening(page)).toContainText('Next: Goldstone tomorrow at 02:16 UTC');
    const earth = listening(page).getByRole('img', { name: 'The Earth seen from the Moon, Sun 22 Nov · 20:00 UTC' });
    await expect(earth).toBeVisible();
    const small = (await earth.boundingBox())!;
    expect(small.width).toBeLessThanOrEqual(40);
    // The complex and the Moon over it share the row beside the Earth.
    const title = (await listening(page).locator('.dsn-block__title').boundingBox())!;
    const line = (await listening(page).locator('.dsn-block__line').first().boundingBox())!;
    expect(Math.abs(title.y + title.height - (line.y + line.height))).toBeLessThanOrEqual(4);
    expect(title.x).toBeGreaterThanOrEqual(small.x + small.width);
    await scroller(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await shot(page, 'after-v04-card-scrolled', card(page));
  });

  test('nothing in the card is clipped, and every block stays inside it', async ({ page }) => {
    await open(page, './?site=im2-athena', 500);
    await expect(listening(page)).toContainText('Robledo');
    const texts = '.dsn-block__head, .dsn-block__title, .dsn-block__line, .dsn-block__next, .source-note--down span,'
      + ' .horizon__head, .card-tile__value, .card-facts dd, .card-head__name';
    expect(await clipped(card(page), texts)).toEqual([]);
    const room = (await scroller(page).boundingBox())!;
    for (const block of await scroller(page).locator(':scope > *').all()) {
      const box = (await block.boundingBox()) as Box;
      expect(box.x).toBeGreaterThanOrEqual(room.x - 0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(room.x + room.width + 0.5);
    }
    // The scroll edge fade of VENT-55 still says the card goes on.
    await expect(scroller(page)).toHaveAttribute('data-fade-bottom', 'true');
  });

  test('in the Horizon view the folded block holds the DSN alone', async ({ page }) => {
    await open(page, './?site=im2-athena#horizon');
    await expect(listening(page)).toContainText('Robledo');
    await expect(card(page).locator('.horizon--card')).toHaveCount(0);
    await expect(card(page).locator('.card-block').filter({ has: region(page) })).toHaveCount(1);
  });
});

test.describe('phone, 390x844: the Sites sheet starts with the list (V-12 C)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  const sheet = (page: Page) => page.locator('.sheet');
  const gear = (page: Page) => sheet(page).getByRole('button', { name: 'Settings' });
  const back = (page: Page) => sheet(page).getByRole('button', { name: 'Landing sites' });
  const settings = (page: Page) => sheet(page).locator('.settings-page');

  async function openSites(page: Page, path = './?site=im2-athena'): Promise<void> {
    await open(page, path);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await expect(sheet(page).getByRole('list', { name: 'Sites' })).toBeVisible();
  }

  test('«Drop a pin», the search, the regions and the list come first; the settings are not in the list', async ({ page }) => {
    await openSites(page);
    const scroll = sheet(page).locator('.picker__scroll');
    const order = await scroll.evaluate((el) =>
      [...el.children].map((child) => child.className.split(' ')[0]));
    expect(order.slice(0, 4)).toEqual(['settings-group', 'search', 'segmented', 'site-list']);
    await expect(scroll.getByRole('button', { name: 'Drop a pin' })).toBeVisible();
    await expect(scroll.getByRole('region', { name: 'Layers' })).toHaveCount(0);
    await expect(scroll.locator('.lang-row')).toHaveCount(0);
    await expect(scroll.getByRole('radiogroup', { name: 'Data source' })).toHaveCount(0);
    // The gear sits in the head, beside «Done», a 44 px target.
    const target = (await gear(page).boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
    const done = (await sheet(page).locator('.picker__done').first().boundingBox())!;
    expect(target.x + target.width).toBeLessThanOrEqual(done.x + 0.5);
    expect(Math.abs(target.y + target.height / 2 - (done.y + done.height / 2))).toBeLessThanOrEqual(2);
    await shot(page, 'after-v12-sheet');
  });

  test('the gear opens Settings with the three groups; Back returns to the list with the focus on the gear', async ({ page }) => {
    await openSites(page);
    await gear(page).click();
    await expect(settings(page).getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(back(page)).toBeFocused();
    const layers = settings(page).getByRole('region', { name: 'Layers' });
    await expect(layers).toBeVisible();
    await expect(layers).toContainText(SAVE_HINT);
    await expect(settings(page).getByRole('button', { name: /^Language\s*English/ })).toBeVisible();
    await expect(settings(page).getByRole('radiogroup', { name: 'Data source' })).toBeVisible();
    await expect(sheet(page).getByRole('list', { name: 'Sites' })).toBeHidden();
    await shot(page, 'after-v12-settings');
    await back(page).click();
    await expect(gear(page)).toBeFocused();
    await expect(sheet(page).getByRole('list', { name: 'Sites' })).toBeVisible();
    await expect(settings(page)).toHaveCount(0);
    // Escape goes back the same way.
    await gear(page).click();
    await expect(back(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(gear(page)).toBeFocused();
  });

  test('the Language row still works from Settings: its list, Back to the row, and a new language', async ({ page }) => {
    await openSites(page);
    await gear(page).click();
    const row = settings(page).getByRole('button', { name: /^Language\s*English/ });
    await row.click();
    const menu = page.getByRole('menu', { name: 'Language' });
    await expect(menu.getByRole('menuitemradio', { name: /^English/ })).toBeFocused();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(row).toBeFocused();
    await expect(menu).toHaveCount(0);
    // Escape in the list goes back one page only: Settings stays.
    await row.click();
    await page.keyboard.press('Escape');
    await expect(row).toBeFocused();
    await expect(settings(page).getByRole('heading', { name: 'Settings' })).toBeVisible();
    await row.click();
    await menu.getByRole('menuitemradio', { name: /^Deutsch/ }).click();
    await expect(page).toHaveURL(/\/de\/\?site=im2-athena$/);
  });

  test('«Done» on Settings closes the sheet', async ({ page }) => {
    await openSites(page);
    await gear(page).click();
    await settings(page).getByRole('button', { name: 'Done' }).click();
    await expect(sheet(page).locator('.picker')).toHaveCount(0);
  });

  test('at 200 % text the Settings page keeps every group inside the sheet and its last one reachable', async ({ page }) => {
    await openSites(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await gear(page).click();
    const switcher = settings(page).getByRole('radiogroup', { name: 'Data source' });
    await switcher.scrollIntoViewIfNeeded();
    await expect(switcher).toBeInViewport();
    const tabs = (await page.locator('.tab-bar').boundingBox())!;
    const box = (await switcher.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(tabs.y);
    const outside = await settings(page).locator('.settings-group, .layers-group, .lang-page__head').evaluateAll((els) =>
      els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < -0.5 || r.right > innerWidth + 0.5;
      }).length);
    expect(outside).toBe(0);
    await expectHeadApart(page);
    await shot(page, 'after-v12-settings-200');
  });
});

/** Back, the title and «Done» of the Settings page sit apart, inside the screen. */
async function expectHeadApart(page: Page): Promise<void> {
  const head = page.locator('.settings-page__head');
  const boxes = await Promise.all(['.lang-page__back', '.lang-page__title', '.picker__done'].map(
    async (selector) => (await head.locator(selector).boundingBox())!,
  ));
  const width = page.viewportSize()!.width;
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  const [back, title, done] = boxes as [Box, Box, Box];
  expect(back.x + back.width).toBeLessThanOrEqual(title.x + 0.5);
  expect(title.x + title.width).toBeLessThanOrEqual(done.x + 0.5);
}

test.describe('phone, 320x640, the pseudo-locale: the Settings head stays whole', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });

  test('Back, the title and «Done» keep apart inside the screen', async ({ page }) => {
    await open(page, './en-xa/');
    await page.locator('.tab-bar .tab').last().click();
    await page.locator('.picker__gear').click();
    await expect(page.locator('.settings-page__head')).toBeVisible();
    await expectHeadApart(page);
  });
});
