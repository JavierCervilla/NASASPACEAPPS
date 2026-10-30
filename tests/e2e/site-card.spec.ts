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
 * The desktop site card beside the view and the polar map view (VENT-5, validated canvases «Globe view» and «Polar
 * map»), at the canvas's date: IM-2 answers real JPL Horizons hours for November 2026 (api-stub.ts).
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');

async function open(page: Page, status = 200): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page, { status });
  await page.goto('./');
}

const card = (page: Page) => page.getByRole('complementary', { name: 'Site card' });
const slider = (page: Page) => page.getByRole('region', { name: 'Calendar' }).getByRole('slider', { name: 'Selected hour' });
const map = (page: Page) => page.getByRole('region', { name: 'South pole map, 80 to 90 degrees south' });
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'View' }).getByRole('link', { name });
/** A tile of the card: its label, value and detail, by the label's start. */
const tile = (page: Page, label: RegExp) => card(page).locator('.card-tile').filter({ has: page.locator('.card-tile__label', { hasText: label }) });

/** The value of the card's list row `label`. */
async function fact(page: Page, label: string): Promise<string> {
  return (await card(page).locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd').textContent()) ?? '';
}

async function openPolarMap(page: Page): Promise<void> {
  await tab(page, 'Polar map').click();
  await expect(map(page)).toBeVisible();
}

test.describe('desktop site card and polar map, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the card shows IM-2 at the instant: mission, point, countdowns and the month', async ({ page }) => {
    await open(page);
    await expect(card(page).getByRole('heading', { name: 'IM-2 Athena' })).toBeVisible();
    await expect(card(page).getByText('Intuitive Machines / NASA CLPS · landed 6 Mar 2025')).toBeVisible();
    await expect(card(page).getByText('84.79° S, 29.20° E · exact touchdown')).toBeVisible();
    // Real hours: the same values the canvas and the phone widgets show.
    await expect(tile(page, /^Sunset in$/)).toContainText('7 d 1 h');
    await expect(tile(page, /^Sunset in$/)).toContainText('Sun 6.4° up');
    await expect(tile(page, /^Earthset in$/)).toContainText('7 d 10 h');
    await expect(tile(page, /^Earthset in$/)).toContainText('Earth 10.6° up');
    expect(await fact(page, 'Hours with Sun')).toBe('59 %');
    expect(await fact(page, 'Hours with Earth')).toBe('58 %');
    expect(await fact(page, 'Landing window')).toBe('48 %');
    expect(await fact(page, 'Longest window')).toBe('14 d 1 h');
    expect(await fact(page, 'Longest night')).toBe('12 d');
    await expect(card(page).getByText('November 2026 · JPL Horizons, 1 h step · Sun above 0°, Earth above 3°')).toBeVisible();
    // The card sits to the right of the globe, as on the canvas.
    const globe = await page.getByRole('region', { name: 'Lunar globe' }).boundingBox();
    const aside = await card(page).boundingBox();
    expect(aside?.x ?? 0).toBeGreaterThan((globe?.x ?? 0) + (globe?.width ?? 0));
  });

  test('moving the slider moves the card countdowns with it', async ({ page }) => {
    await open(page);
    await expect(tile(page, /^Sunset in$/)).toContainText('7 d 1 h');
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tile(page, /^Sunset in$/)).toContainText('7 d');
    await expect(tile(page, /^Sunset in$/)).not.toContainText('7 d 1 h');
    await expect(tile(page, /^Earthset in$/)).toContainText('7 d 9 h');
  });

  test('the card says when the data cannot load, with «Try again»', async ({ page }) => {
    await open(page, 500);
    await expect(card(page).getByRole('alert')).toContainText('could not load');
    await expect(card(page).getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('the Polar map tab shows the map and its sites in place of the globe, the card beside it', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await expect(tab(page, 'Polar map')).toHaveAttribute('aria-current', 'page');
    await expect(tab(page, 'Globe')).not.toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', { name: 'Lunar globe' })).toBeHidden();
    await expect(map(page).locator('img.polar__image')).toHaveJSProperty('complete', true);
    expect(await map(page).locator('img.polar__image').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2048);
    // 15 curated sites lie south of 80° S; those sharing a point share a marker: 11.
    await expect(map(page).getByRole('button')).toHaveCount(11);
    const im2 = map(page).getByRole('button', { name: 'Mons Mouton (IM-2 Athena), landing site' });
    await expect(im2).toHaveAttribute('aria-pressed', 'true');
    await expect(im2).toHaveAttribute('data-state', 'window');
    await expect(map(page).getByRole('button', { name: /^Haworth .*approximate zone$/ })).toBeVisible();
    for (const box of await map(page).getByRole('button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(card(page)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Calendar' })).toBeVisible();
  });

  test('clicking IM-1 on the map selects it: the card and the header follow', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await map(page).getByRole('button', { name: /IM-1 Odysseus/ }).click();
    await expect(card(page).getByRole('heading', { name: 'IM-1 Odysseus' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Change site, now IM-1 Odysseus/ })).toBeVisible();
    await expect(map(page).getByRole('button', { name: /IM-1 Odysseus/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(tile(page, /^Sun(set|rise) in$/)).toBeVisible();
  });

  test('where targets overlap near the pole, a click goes to the nearest dot', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    const change7 = map(page).getByRole('button', { name: /Chang'e-7/ });
    const bluemoon = map(page).getByRole('button', { name: /Blue Moon/ });
    const [a, b] = [await change7.boundingBox(), await bluemoon.boundingBox()];
    if (!a || !b) throw new Error('no markers');
    // The two 44 px targets overlap, and Blue Moon's sits on top: the click on Chang'e-7's dot must still pick it.
    expect(Math.abs(a.x - b.x) < 44 && Math.abs(a.y - b.y) < 44).toBe(true);
    await page.mouse.click(a.x + a.width / 2, a.y + a.height / 2);
    await expect(change7).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(bluemoon).toHaveAttribute('aria-pressed', 'true');
  });

  test('a site picked with the keyboard is selected too', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await map(page).getByRole('button', { name: /^Haworth/ }).focus();
    await page.keyboard.press('Enter');
    await expect(card(page).getByRole('heading', { name: 'Artemis candidate region' })).toBeVisible();
    await expect(card(page).getByText('Haworth', { exact: true })).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Space');
    await expect(card(page).getByText('Haworth', { exact: true })).toBeHidden();
  });

  test('a site north of 80° S is not drawn, and the map says so while the card shows it', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(map(page).getByRole('status')).toHaveText('Apollo 11 lies north of 80° S, off this map');
    await expect(map(page).locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(card(page).getByRole('heading', { name: 'Apollo 11' })).toBeVisible();
  });

  test('switching back to Globe keeps the site and the instant', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await map(page).getByRole('button', { name: /IM-1 Odysseus/ }).click();
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    const value = await slider(page).inputValue();
    await tab(page, 'Globe').click();
    await expect(map(page)).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Lunar globe' }).locator('canvas')).toHaveCount(1);
    await expect(page.locator('.globe-label')).toHaveText('Malapert A region (IM-1 Odysseus)');
    await expect(card(page).getByRole('heading', { name: 'IM-1 Odysseus' })).toBeVisible();
    await expect(slider(page)).toHaveValue(value);
    await expect(tab(page, 'Globe')).toHaveAttribute('aria-current', 'page');
  });
});

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** The page boxes of every element `selector` matches. */
const boxesOf = (page: Page, selector: string): Promise<(Box & { text: string; id: string })[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x, y, width, height, text: el.textContent ?? '', id: (el as HTMLElement).dataset['siteId'] ?? '' };
    }),
  );
/** The box a marker's dot keeps clear: 7 px around the centre of its 44 px button. */
const dotOf = (button: Box): Box => ({ x: button.x + button.width / 2 - 7, y: button.y + button.height / 2 - 7, width: 14, height: 14 });

for (const [width, height] of [[1280, 720], [1024, 768]] as const) {
  test.describe(`site card on a short screen, ${width}x${height} (QA)`, () => {
    test.use({ viewport: { width, height } });
    const scroller = (page: Page) => card(page).getByRole('group', { name: 'Site details' });

    test('the cut-off card fades at the edge that hides more, and the keyboard scrolls it', async ({ page }) => {
      await open(page);
      await expect(card(page).getByText('Longest night')).toBeAttached();
      const box = scroller(page);
      await expect(box).toHaveAttribute('tabindex', '0');
      expect(await box.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await expect(box).toHaveAttribute('data-fade-bottom', 'true');
      await expect(box).toHaveAttribute('data-fade-top', 'false');
      expect(await box.evaluate((el) => getComputedStyle(el).maskImage)).toMatch(/calc\(100% - 56px\)/);
      // Tab from the header's last control reaches it, and the ring shows on the card.
      await box.focus();
      await expect(box).toBeFocused();
      expect(await card(page).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
      await page.keyboard.press('End');
      await expect(box).toHaveAttribute('data-fade-top', 'true');
      await expect(box).toHaveAttribute('data-fade-bottom', 'false');
      await expect(card(page).getByText(/^November 2026 · JPL Horizons/)).toBeInViewport();
    });

    test('the page the server sends carries no style attribute (CSP style-src-attr none)', async ({ page }) => {
      const html = await (await page.request.get('./')).text();
      expect(html).toContain('site-card__scroll');
      expect(html).not.toMatch(/\sstyle="/);
    });
  });
}

test.describe('polar map labels, 1440x900 (QA)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function pick(page: Page, name: RegExp): Promise<void> {
    await map(page).getByRole('button', { name }).focus();
    await page.keyboard.press('Enter');
  }

  test('a landed site keeps its label over a zone on its dot, selected or not', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await pick(page, /^Haworth/);
    const labels = await boxesOf(page, '.polar-label');
    expect(labels.map(({ text }) => text)).toContain('IM-2');
    expect(labels.map(({ text }) => text).filter((text) => /Mons Mouton|\+\d/.test(text))).toEqual([]);
  });

  test('a merged marker reads «<place> · N sites» and its button keeps every name', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    await expect(map(page).locator('.polar-label', { hasText: 'Nobile · 3 sites' })).toBeVisible();
    const nobile = map(page).getByRole('button', { name: /^Nobile region near Mons Mouton \(Griffin-1, FLIP rover\); Nobile Rim 1/ });
    await expect(nobile).toHaveAttribute('aria-label', /Nobile Rim 2 \(Artemis candidate region\), approximate zone$/);
  });

  test('every marker has a label or a number, the key names each number, and nothing overlaps', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    const buttons = await boxesOf(page, '.polar-marker');
    const badges = await boxesOf(page, '.polar-badge');
    const named = await boxesOf(page, '.polar-label, .polar-badge');
    expect(buttons).toHaveLength(11);
    for (const { id } of buttons) expect(named.some((one) => one.id === id), id).toBe(true);
    expect(badges.length).toBeGreaterThan(0);
    const rows = await map(page).locator('.polar-key li').allTextContents();
    expect(rows).toEqual(badges.map(({ text }) => expect.stringMatching(new RegExp(`^${text}\\D`))));
    expect(rows.join(' ')).toContain("Chang'e-7");
    expect(rows.join(' ')).toContain('Shackleton connecting ridge');
    const key = (await map(page).locator('.polar-key').boundingBox())!;
    for (const [i, a] of named.entries()) {
      for (const b of named.slice(i + 1)) expect(intersects(a, b), `${a.text} over ${b.text}`).toBe(false);
      expect(intersects(a, key), `the key over ${a.text}`).toBe(false);
    }
    for (const button of buttons) expect(intersects(dotOf(button), key)).toBe(false);
  });

  test('the selected IM-2 label starts clear of its enlarged dot and ring', async ({ page }) => {
    await open(page);
    await openPolarMap(page);
    const dot = (await map(page).locator('[data-site-id="im2-athena"].polar-marker').boundingBox())!;
    const label = (await map(page).locator('.polar-label', { hasText: /^IM-2$/ }).boundingBox())!;
    // 14 px dot with a 4 px ring: 11 px from the centre.
    expect(label.x).toBeGreaterThanOrEqual(dot.x + dot.width / 2 + 11 + 4);
  });
});

for (const [width, height] of [[1440, 900], [1024, 768]] as const) {
  test(`at ${width}x${height} the off-map note stays clear of IM-1 and the 0° tick (QA)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await open(page);
    await openPolarMap(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    const note = (await map(page).getByRole('status').boundingBox())!;
    const im1 = (await map(page).getByRole('button', { name: /IM-1 Odysseus/ }).boundingBox())!;
    const tick = (await map(page).locator('.graticule-label--top').boundingBox())!;
    const im1Label = await boxesOf(page, '.polar-label');
    expect(intersects(note, dotOf(im1))).toBe(false);
    expect(intersects(note, tick)).toBe(false);
    for (const label of im1Label) expect(intersects(note, label), label.text).toBe(false);
  });
}
