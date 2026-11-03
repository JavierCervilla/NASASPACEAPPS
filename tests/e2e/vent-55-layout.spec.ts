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
 * VENT-55 part C, layout polish from the VENT-53 audit: the phone's top bar with a long saved name (V-02), the sheet's
 * head at 200 % text (V-03), scroll edge fades on what scrolls (C-10), 44 px targets drawn smaller (C-15), the 3D
 * view's status under the full sheet (V-13), one horizon strip in the desktop Horizon view (V-16), rename opening on
 * the whole name (V-17) and a saved row's padding (V-18).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const GLOBE_START_MS = 20_000;
const LONG = 'Rim camp with a fairly long descriptive name for tests';
const SAVED = [{ id: '@-85.87,61.34', name: LONG, lat: -85.87, lonEast: 61.34, savedAt: 3 }];
const POINT = '?lat=-85.87&lon=61.34';

/** Opens `path` at the fixed instant with the API stubbed, the hint seen and `saved` kept on the device. */
async function open(page: Page, path = './', saved: readonly object[] = []): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  const kept = JSON.stringify({ v: 1, sites: saved });
  await page.addInitScript((sites) => {
    localStorage.setItem('ventana.pinHint', 'seen');
    localStorage.setItem('ventana.savedSites', sites);
  }, kept);
  await page.goto(path);
}

const globeReady = (page: Page) =>
  expect(page.locator('.globe-viewport[data-status="ready"]:visible').first()).toBeVisible({ timeout: GLOBE_START_MS });

/** How many lines `el`'s text takes: its height over its line height. */
const lines = (locator: Locator) =>
  locator.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));

/** The boxes of the text inside `el`, through a range over its contents. */
const textBoxes = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return [...range.getClientRects()].map(({ x, y, width, height }) => ({ x, y, width, height }));
  });

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

/** Whether a scroll box fades its edges: which edges say there is more, and whether a mask is painted. */
const fades = (locator: Locator) =>
  locator.evaluate((el) => ({
    top: el.getAttribute('data-fade-top'),
    bottom: el.getAttribute('data-fade-bottom'),
    masked: getComputedStyle(el).maskImage !== 'none',
  }));

/** Scrolls a box to its end and waits for the fades to follow. */
async function expectFadesBothWays(box: Locator): Promise<void> {
  await expect.poll(() => fades(box)).toEqual({ top: 'false', bottom: 'true', masked: true });
  await box.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => fades(box)).toEqual({ top: 'true', bottom: 'false', masked: true });
}

/** The element a tap at `dy` px above (negative) or below the box's edge lands on is inside `target`. */
async function hitsAt(page: Page, target: Locator, edge: 'top' | 'bottom', dy: number): Promise<boolean> {
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = edge === 'top' ? box.y - dy : box.y + box.height + dy;
  return target.evaluate((el, at) => {
    const hit = document.elementFromPoint(at.x, at.y);
    return hit !== null && (el.contains(hit) || hit.contains(el) && hit.tagName === 'LABEL');
  }, { x, y });
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // V-02: a long saved name made «Ventana Lunar» take two lines and the rule three; the name gives way first.
  for (const hash of ['', '#dsn', '#horizon'] as const) {
    test(`with a long saved name the title and the rule keep one line each${hash ? ` (${hash})` : ''}`, async ({ page }) => {
      await open(page, `./${POINT}${hash}`, SAVED);
      const name = page.locator('.site-pill__name');
      await expect(name).toHaveText(LONG);
      expect(await lines(page.locator('.phone-bar__title'))).toBe(1);
      expect(await lines(page.locator('.phone-bar__rule'))).toBe(1);
      expect(await name.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      await expect.poll(() => page.locator('.site-pill__state .fit-line__shown')
        .evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect((await page.locator('.phone-bar').boundingBox())!.height).toBeLessThanOrEqual(64);
    });
  }

  // C-10: the site picker fades the edge its list runs under.
  test('the site picker\'s scroll box fades its edges', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await expectFadesBothWays(page.locator('.picker__scroll'));
  });

  // C-15: the segmented control and the search field are drawn at 40 px (a segment in its 44 px control since
  // VENT-57, C-16), and taken at 44.
  test('the segmented control and the search field take a tap 44 px tall', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    const segment = page.getByRole('button', { name: 'Apollo', exact: true });
    // At 44 px the control's last 2 px sit under the picker's scroll edge until it scrolls.
    await segment.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    expect((await segment.boundingBox())!.height).toBe(40);
    expect(await hitsAt(page, segment, 'top', 1.5)).toBe(true);
    expect(await hitsAt(page, segment, 'bottom', 1.5)).toBe(true);
    const search = page.locator('.search');
    expect(await hitsAt(page, search, 'top', 1.5)).toBe(true);
    expect(await hitsAt(page, search, 'bottom', 1.5)).toBe(true);
  });

  // V-13: the 3D view's status stayed, ghosted, between the bar and the full sheet that covers its view.
  test('the 3D view\'s status hides while the full sheet covers its view', async ({ page }) => {
    await open(page, './#horizon');
    const status = page.locator('.on-foot__status, .on-foot-wait').first();
    await expect(status).toBeVisible();
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'full');
    await expect(page.locator('.on-foot__status, .on-foot-wait')).toBeHidden();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('.on-foot__status, .on-foot-wait').first()).toBeVisible();
  });
});

for (const [width, height] of [[390, 844], [360, 780]] as const) {
  test.describe(`phone, ${width}x${height}, 200 % text`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    // V-03: «Mons Mouton» on two lines sat over «84.79° S, 29.20° E»; they stack when they do not fit side by side.
    test('the sheet\'s head stacks the name and the point, inside it, instead of overlapping them, at half and at peek', async ({ page }) => {
      await open(page);
      await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      const name = page.locator('.summary__name');
      await expect(name).toHaveText('Mons Mouton');
      const clear = async () => {
        const words = await textBoxes(name);
        const point = (await page.locator('.summary__coords').boundingBox())!;
        const head = (await page.locator('.summary__head').boundingBox())!;
        const inside = point.x >= head.x - 0.5 && point.x + point.width <= head.x + head.width + 0.5;
        return inside && words.every((box) => !overlap(box, point));
      };
      await expect.poll(clear).toBe(true);
      await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
      await page.getByRole('button', { name: /^Sheet full height/ }).press('Enter');
      await expect(page.getByRole('button', { name: /^Sheet collapsed/ })).toBeVisible();
      await expect.poll(clear).toBe(true);
    });
  });
}

test.describe('phone, 390x844, 200 % text', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // C-10: at large text the Calendar sheet scrolls (phone.spec.ts, QA F2) and fades its edges.
  test('the Calendar sheet fades its edges', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar' }).click();
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await expectFadesBothWays(page.locator('.calendar'));
  });
});

test.describe('phone, 360x780, 200 % text: the summary scrolls', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });

  // C-10: the half sheet's summary, taller than the full detent, scrolls (VENT-44) and fades its edges.
  test('the summary fades its edges while it scrolls', async ({ page }) => {
    await open(page);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    const summary = page.locator('.summary[data-sheet-scroll]');
    await expect(summary).toHaveCount(1);
    await expectFadesBothWays(summary);
  });
});

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // V-16: the view's strip said «Height ×2» and the card's «Height ×5» for one site; the view keeps its own.
  test('the Horizon view shows one horizon strip, its own', async ({ page }) => {
    await open(page, './#horizon');
    await expect(page.locator('.horizon--on-foot')).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.horizon--card')).toHaveCount(0);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Globe' }).click();
    await expect(page.locator('.horizon--card')).toBeVisible();
  });

  async function savedSegment(page: Page): Promise<Locator> {
    await open(page, `./${POINT}`, SAVED);
    await globeReady(page);
    await page.locator('.site-button').click();
    const popover = page.locator('#site-popover');
    await popover.getByRole('button', { name: /^Saved/ }).click();
    return popover;
  }

  // V-17: rename opened with the caret at the end and the name's start cut off.
  test('rename opens on the whole name selected, its start in view', async ({ page }) => {
    const popover = await savedSegment(page);
    await popover.getByRole('button', { name: `More for ${LONG}` }).click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const field = popover.locator('.saved-row__input');
    await expect(field).toBeFocused();
    expect(await field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd, el.scrollLeft]))
      .toEqual([0, LONG.length, 0]);
  });

  // C-15: the rename field is drawn at 40 px and takes a tap on its whole row, without ending the rename.
  test('a tap beside the rename field keeps it editing', async ({ page }) => {
    const popover = await savedSegment(page);
    await popover.getByRole('button', { name: `More for ${LONG}` }).click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const field = popover.locator('.saved-row__input');
    expect((await field.boundingBox())!.height).toBe(40);
    expect(await hitsAt(page, field, 'top', 2)).toBe(true);
    expect(await hitsAt(page, field, 'bottom', 2)).toBe(true);
    const box = (await field.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y - 2);
    await expect(field).toBeFocused();
  });

  // V-18: with its name on two lines, a saved row's state and point touched its bottom edge.
  test('a saved row with a two-line name keeps its padding under the point', async ({ page }) => {
    const popover = await savedSegment(page);
    const row = popover.locator('.saved-row__pick');
    expect(await lines(row.locator('.site-row__title'))).toBeGreaterThanOrEqual(2);
    const detail = (await row.locator('.site-row__detail').boundingBox())!;
    const box = (await row.boundingBox())!;
    expect(box.y + box.height - (detail.y + detail.height)).toBeGreaterThanOrEqual(8);
  });

  // C-15: the Layers key's switches are drawn 32 px tall and taken at 44.
  test('a Layers key row takes a tap above and below its drawing', async ({ page }) => {
    await open(page);
    await globeReady(page);
    const row = page.locator('.globe .layer-row__label').first();
    expect((await row.boundingBox())!.height).toBe(32);
    expect(await hitsAt(page, row, 'top', 5)).toBe(true);
  });
});

test.describe('desktop, 1280x480: what scrolls fades', () => {
  test.use({ viewport: { width: 1280, height: 480 } });

  // C-10: the Layers key, taller than its view at large text, scrolls inside and fades.
  test('the Layers key fades its edges', async ({ page }) => {
    await open(page);
    await globeReady(page);
    await page.addStyleTag({ content: 'html { font-size: 150%; }' });
    await expectFadesBothWays(page.locator('.globe .globe-layers__scroll'));
  });

  // C-10: the language list.
  test('the language list fades its edges', async ({ page }) => {
    await open(page);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.locator('.lang-button').click();
    await expectFadesBothWays(page.locator('.lang-popover .lang-list'));
  });

  // C-10: the DSN view.
  test('the DSN view fades its edges', async ({ page }) => {
    await open(page, './#dsn');
    await expectFadesBothWays(page.locator('.dsn-view'));
  });
});
