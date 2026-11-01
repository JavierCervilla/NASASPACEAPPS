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

import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

// Requests only the globe makes: its chunk (Three.js inside) and the Moon texture.
const GLOBE_ASSET = /\/_astro\/globe\.[^/]*\.js$|\/textures\/moon-lroc-/;
// The canvas's date, so the widgets read the same in every run; IM-2 answers real data for it (api-stub.ts).
const NOW = new Date('2026-11-23T18:00:00Z');
// Where the sheet's top edge rests at 390x844: half shows 344 px, full sits under the 96 px of the top bar.
const HALF_TOP = 844 - 344;
const FULL_TOP = 96;
// Peek shows 156 px: the name and the coordinates, clear of the tab bar.
const PEEK_TOP = 844 - 156;
// Closed, the edge rests 56 px below the screen, past the reach of the sheet's shadow.
const CLOSED_TOP = 844 + 56;

/** The element's box once two reads 200 ms apart agree. */
async function settledBox(locator: Locator): Promise<{ x: number; y: number } | null> {
  let last = JSON.stringify(await locator.boundingBox());
  await expect
    .poll(async () => {
      await locator.page().waitForTimeout(200);
      const now = JSON.stringify(await locator.boundingBox());
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
  return JSON.parse(last) as { x: number; y: number } | null;
}

async function open(page: Page): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto('./');
}

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Views' });

/** A closed sheet is off-screen, inert, and nothing in it takes focus. */
async function expectClosed(page: Page): Promise<void> {
  await expect.poll(() => sheetTop(page)).toBe(CLOSED_TOP);
  await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
  const focusable = await page.locator('.sheet__grabber').evaluate((el) => {
    (el as HTMLElement).focus();
    return document.activeElement === el;
  });
  expect(focusable).toBe(false);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Change site, now/ })).toBeVisible();
  await expect(tabs(page)).toBeVisible();
}

/** A finger drag up from the tab bar's top edge, 220 px, as a mouse; held down with `release: false`. */
async function dragUpFromTabBar(page: Page, { release = true } = {}): Promise<void> {
  const bar = await tabs(page).boundingBox();
  const y = (bar?.y ?? 0) + 10;
  await page.mouse.move(195, y);
  await page.mouse.down();
  await page.mouse.move(195, y - 80, { steps: 5 });
  await page.mouse.move(195, y - 220, { steps: 5 });
  if (release) await page.mouse.up();
}

const sheetTop = (page: Page) => page.locator('.sheet').evaluate((el) => Math.round(el.getBoundingClientRect().top));

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('draws the globe under the glass bar, with the sheet at half and four widgets', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ventana Lunar');
    await expect(page.locator('section.globe canvas')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Change site, now Mons Mouton (IM-2 Athena): Window · 7 d left', exact: true })).toBeVisible();
    await expect(page.locator('.summary__subtitle')).toHaveText('IM-2 Athena');
    const widgets = page.getByRole('list', { name: 'This site now' }).getByRole('listitem');
    await expect(widgets).toHaveCount(4);
    await expect(widgets.nth(0)).toContainText('Landing window');
    // Real JPL Horizons data for IM-2: the window share of November and the sunset a week later, on 30 November.
    await expect(widgets.nth(0)).toContainText('48 % of November');
    await expect(widgets.nth(1)).toContainText('Sunset in7 d 1 h');
    await expect(widgets.nth(1)).toContainText('Sun 6.4° up');
    await expect(widgets.nth(2)).toContainText('Earth 10.6° up');
    await expect(widgets.nth(3)).toContainText('Robledo');
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
    // No card floats over the globe (VENT-33): the pill carries the state, the ring marks the site.
    await expect(page.locator('.globe-callout')).toHaveCount(0);
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
  });

  test('dragging the sheet up reaches the site picker', async ({ page }) => {
    await open(page);
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
    await page.mouse.move(195, HALF_TOP + 40);
    await page.mouse.down();
    await page.mouse.move(195, HALF_TOP - 100, { steps: 8 });
    await page.mouse.move(195, 200, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
    await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    await expect(page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' })).toHaveAttribute('aria-current', 'true');
  });

  test('the grabber is at least 44 px tall to the finger, with the same small pill', async ({ page }) => {
    await open(page);
    const grabber = page.getByRole('button', { name: /^Sheet half height/ });
    const box = await grabber.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    const bar = await page.locator('.sheet__bar').boundingBox();
    expect([bar?.width, bar?.height]).toEqual([36, 5]);
    // The pill stays 12 px below the sheet's top edge, where the 24 px grabber had it.
    expect(Math.round((bar?.y ?? 0) + 2.5 - HALF_TOP)).toBe(12);
  });

  test('the grabber is a button that cycles the detents from the keyboard', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const grabber = page.getByRole('button', { name: /^Sheet half height/ });
    await expect(grabber).toHaveAttribute('aria-expanded', 'false');
    await grabber.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
    // Under reduced motion the sheet lands at once, without a spring.
    expect(await sheetTop(page)).toBe(FULL_TOP);
    await page.getByRole('button', { name: /^Sheet full height/ }).press('Enter');
    await expect.poll(() => sheetTop(page)).toBe(PEEK_TOP);
  });

  test('search spans every region and names it; with the query cleared the region control filters', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now Mons Mouton \(IM-2 Athena\)/ }).click();
    const rows = page.getByRole('list', { name: 'Sites' }).getByRole('listitem');
    const search = page.getByRole('searchbox', { name: 'Search a site or mission' });
    await expect(rows).toHaveCount(16);
    // South pole is the region picked, and Apollo 11 is found anyway, with its region on the row.
    await search.fill('apollo 11');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Apollo · Apollo 11');
    await expect(page.getByRole('button', { name: 'Apollo', exact: true })).toBeDisabled();
    await search.fill('mouton');
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toContainText('South pole · IM-2 Athena');
    await search.fill('');
    await expect(rows).toHaveCount(16);
    await expect(rows.first()).not.toContainText('South pole ·');
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await expect(rows).toHaveCount(6);
  });

  test('choosing a site changes the pill, the widgets and the globe', async ({ page }) => {
    await open(page);
    await expect(page.locator('.widget').first()).toContainText('Landing window');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.getByRole('button', { name: /^Change site, now Mare Tranquillitatis \(Tranquility Base\) \(Apollo 11\): Neither · / })).toBeVisible();
    await expect(page.locator('.widget').first()).toContainText('No window');
    // Apollo 11's stub has the Earth under the horizon: no link comes first (VENT-7).
    await expect(page.locator('.widget').nth(3)).toContainText('No link');
    await expect(page.locator('[data-site-id="apollo11"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'none');
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
  });

  test('reaches the Mons Mouton zone that the globe hides under IM-2', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now Mons Mouton \(IM-2 Athena\)/ }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mons Mouton\s*Artemis candidate region/ }).click();
    // The pill and the title tell the zone apart from IM-2, which shares the place name.
    await expect(page.getByRole('button', { name: /^Change site, now Mons Mouton \(Artemis candidate region\): / })).toBeVisible();
    await expect(page.locator('.site-pill__name')).toHaveText('Mons Mouton');
    await expect(page.locator('.summary__name')).toHaveText('Mons Mouton');
    await expect(page.locator('.summary__subtitle')).toHaveText('Artemis candidate region');
    const zone = page.locator('[data-site-id="artemis-mons-mouton-plateau"]');
    await expect(zone).toHaveAttribute('aria-pressed', 'true');
    await expect(zone).toBeVisible();
  });

  test('shows the computed widgets while the API is slow, and keeps them when it fails, saying Horizons is down', async ({
    page,
  }) => {
    await page.clock.setFixedTime(NOW);
    let answer = (): void => undefined;
    await stubApi(page, { status: 502, hold: new Promise<void>((done) => (answer = done)) });
    await page.goto('./');
    // VENT-36: the simulator answers at once, with the pill's dot hollow, where there were skeletons.
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect(page.locator('.widget-skeleton')).toHaveCount(0);
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-computed', 'true');
    answer();
    // Orchestrator's decision on PR #19: the failure is said, quietly, and no longer takes the answer away.
    await expect(page.getByRole('status').filter({ hasText: 'Horizons unavailable: showing the computed sky' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-computed', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('says the hour is outside the data window instead of showing clamped data', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2028-03-01T12:00:00Z'));
    await stubApi(page);
    await page.goto('./');
    await expect(page.getByRole('status').filter({ hasText: 'Outside the data window (2026–2027)' })).toBeVisible();
    await expect(page.locator('.widget')).toHaveCount(0);
  });

  test('refreshes the widgets at the top of the hour while the page stays open', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-23T18:59:00Z') });
    await stubApi(page);
    await page.goto('./');
    const sunset = page.locator('.widget').nth(1);
    await expect(sunset).toContainText('Sunset in7 d 1 h');
    await page.clock.runFor('01:30');
    await expect(sunset).toContainText('Sunset in7 d');
    await expect(sunset).not.toContainText('7 d 1 h');
  });

  test('Horizon says soon and does nothing', async ({ page }) => {
    await open(page);
    const horizon = tabs(page).getByRole('button', { name: 'Horizon (soon)' });
    await expect(horizon).toHaveAttribute('aria-disabled', 'true');
    // Playwright treats aria-disabled as disabled and would wait: the tap is forced, as a finger would.
    await horizon.click({ force: true });
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
    await expect(tabs(page).getByRole('button', { name: 'Calendar', exact: true })).not.toHaveAttribute('aria-disabled');
  });

  test('Calendar opens the calendar at full: the month, its shares and the instant', async ({ page }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible();
    await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    await expect(tabs(page).getByRole('button', { name: 'Calendar', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.sheet')).toHaveAttribute('aria-label', 'Calendar');
    // Real JPL Horizons data for IM-2 in November 2026.
    const shares = page.getByRole('list', { name: 'Share of the month' });
    await expect(shares).toContainText('Sun 59 %');
    await expect(shares).toContainText('Earth 58 %');
    await expect(shares).toContainText('Window 48 %');
    const slider = page.getByRole('slider', { name: 'Selected hour' });
    await expect(slider).toHaveAttribute('aria-valuetext', 'Mon 23 Nov · 18:00 UTC');
    await expect(page.locator('.calendar__state')).toContainText('Landing window');
  });

  test('at 200 % text the full sheet stays under the grown top bar, and the day labels never pile up (QA F2)', async ({
    page,
  }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const bottomOf = async (locator: Locator) => {
      const box = await locator.boundingBox();
      return (box?.y ?? 0) + (box?.height ?? 0);
    };
    const bar = page.locator('.phone-bar');
    await expect.poll(async () => (await sheetTop(page)) >= (await bottomOf(bar))).toBe(true);
    await settledBox(page.locator('.sheet'));
    const barBottom = await bottomOf(bar);
    for (const name of ['Previous month', 'Next month']) {
      expect((await page.getByRole('button', { name }).boundingBox())?.y).toBeGreaterThanOrEqual(barBottom);
    }
    expect((await page.getByRole('heading', { name: 'November 2026' }).boundingBox())?.y).toBeGreaterThanOrEqual(barBottom);
    const labels = await page.locator('.columns__days span').evaluateAll((spans) =>
      spans
        .filter((el) => getComputedStyle(el).display !== 'none')
        .map((el) => [el.getBoundingClientRect().top, el.getBoundingClientRect().bottom] as const),
    );
    expect(labels.length).toBeGreaterThan(0);
    // The columns keep room to drag in; what does not fit scrolls, so «Now» comes out from under the tab bar.
    expect((await page.locator('.columns').boundingBox())?.height).toBeGreaterThanOrEqual(160);
    await page.locator('.calendar').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const nowBox = await page.getByRole('button', { name: 'Now', exact: true }).boundingBox();
    expect((nowBox?.y ?? 0) + (nowBox?.height ?? 0)).toBeLessThanOrEqual((await tabs(page).boundingBox())?.y ?? 0);
    for (let i = 1; i < labels.length; i += 1) expect(labels[i]![0]).toBeGreaterThanOrEqual(labels[i - 1]![1]);
  });

  test('a month without data shows no signal: «No data for this hour» and a neutral dot (QA F5)', async ({ page }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    const line = page.locator('.calendar__state');
    await expect(line).toContainText('Landing window');
    // The recorded IM-2 hours start on 1 November: October has none, though its request reaches into November.
    await page.getByRole('button', { name: 'Previous month' }).click();
    await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible();
    await expect(line).toHaveText('No data for this hour');
    await expect(line).not.toHaveAttribute('data-tone');
    const dot = page.locator('.site-pill .signal-dot');
    expect(['window', 'sun', 'earth', 'none']).not.toContain(await dot.getAttribute('data-state'));
  });

  test('a month with no window at all says so in the calendar (QA F6)', async ({ page }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'Sites' }).click();
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Share of the month' })).toContainText('Window 0 %');
    await expect(page.getByText('No landing window this month')).toBeVisible();
  });

  test('dragging in the columns moves the instant, and «Now» brings it back', async ({ page }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    const slider = page.getByRole('slider', { name: 'Selected hour' });
    await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    const box = await slider.boundingBox();
    if (!box) throw new Error('no columns');
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + box.height * 0.8);
    await page.mouse.down();
    await page.mouse.move(x, box.y + box.height * 0.3, { steps: 6 });
    // Past the top: the drag keeps the pointer, and the hour holds at the month's first.
    await page.mouse.move(x, box.y - 30, { steps: 6 });
    await page.mouse.up();
    // The top of the columns is the first hour of the month; the sheet stayed where it was.
    await expect(page.locator('.calendar__date')).toHaveText('Sun 1 Nov · 00:00 UTC');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(await sheetTop(page)).toBe(FULL_TOP);
    const now = page.getByRole('button', { name: 'Now', exact: true });
    await now.click();
    await expect(page.locator('.calendar__date')).toHaveText('Mon 23 Nov · 18:00 UTC');
    await expect(now).toBeDisabled();
  });

  test('the columns move an hour with the arrows and a day with the page keys', async ({ page }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    const slider = page.getByRole('slider', { name: 'Selected hour' });
    await slider.focus();
    await page.keyboard.press('ArrowDown');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Mon 23 Nov · 19:00 UTC');
    await page.keyboard.press('PageUp');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Sun 22 Nov · 19:00 UTC');
  });

  test('the widgets follow the chosen instant, and Globe closes the calendar', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await tabs(page).getByRole('button', { name: 'Calendar', exact: true }).click();
    await page.getByRole('button', { name: 'Previous month' }).click();
    await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible();
    await page.getByRole('button', { name: 'Next month' }).click();
    const slider = page.getByRole('slider', { name: 'Selected hour' });
    await slider.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Mon 30 Nov · 23:00 UTC');
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Sun 1 Nov · 00:00 UTC');
    await page.keyboard.press('ArrowDown');
    await tabs(page).getByRole('button', { name: 'Globe' }).click();
    await expectClosed(page);
    await dragUpFromTabBar(page);
    const widgets = page.getByRole('list', { name: 'This site at Sun 1 Nov · 01:00 UTC' });
    await expect(widgets).toBeVisible();
    await expect(widgets.getByRole('listitem').nth(0)).toContainText('Sun 1 Nov · 01:00 UTC');
  });

  test('with Save-Data, no Three.js chunk loads until the button is pressed', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await open(page);
    const load = page.getByRole('button', { name: 'Load the 3D globe' });
    await expect(load).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requested.filter((url) => GLOBE_ASSET.test(url))).toEqual([]);
    await load.click();
    await expect(page.locator('section.globe canvas')).toHaveCount(1);
    await expect.poll(() => requested.filter((url) => GLOBE_ASSET.test(url)).length).toBe(2);
    await expect(load).toHaveCount(0);
  });

  test.describe('closing the sheet', () => {
    test('a drag down from half closes it, and the pill opens the picker', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await open(page);
      await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
      await page.mouse.move(195, HALF_TOP + 6);
      await page.mouse.down();
      await page.mouse.move(195, HALF_TOP + 120, { steps: 6 });
      await page.mouse.move(195, 840, { steps: 6 });
      await page.mouse.up();
      await expectClosed(page);
      await page.getByRole('button', { name: /^Change site, now/ }).click();
      await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
      await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
      await expect(page.locator('.sheet')).not.toHaveAttribute('inert');
      expect(errors).toEqual([]);
    });

    test('Globe closes it, and Sites opens the picker', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      await tabs(page).getByRole('button', { name: 'Globe' }).click();
      await expectClosed(page);
      await expect(tabs(page).getByRole('button', { name: 'Globe' })).toHaveAttribute('aria-current', 'true');
      await tabs(page).getByRole('button', { name: 'Sites' }).click();
      await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
      // The picker is visible while the spring is still carrying the sheet up.
      await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    });

    test('Done in the picker closes it', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      await page.getByRole('button', { name: /^Change site, now/ }).click();
      await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
      await page.getByRole('button', { name: 'Done' }).click();
      await expectClosed(page);
    });

    test('a drag up from the tab bar opens it at half, and a tap there is still a tap', async ({ page }) => {
      await open(page);
      await tabs(page).getByRole('button', { name: 'Globe' }).click();
      await expectClosed(page);
      await dragUpFromTabBar(page);
      await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
      await expect(page.locator('.widget')).toHaveCount(4);
      // The drag did not press the tab under the finger.
      await expect(page.getByRole('heading', { name: 'Landing sites' })).toHaveCount(0);
      await tabs(page).getByRole('button', { name: 'Sites' }).click();
      await expect(page.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
      await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    });

    test('a drag up from the tab bar does nothing while the sheet is open', async ({ page }) => {
      await open(page);
      await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
      // Mid-drag, before the release: an edge drag would have carried the sheet up under the finger.
      await dragUpFromTabBar(page, { release: false });
      expect(await sheetTop(page)).toBe(HALF_TOP);
      await page.mouse.up();
      await page.waitForTimeout(600);
      expect(await sheetTop(page)).toBe(HALF_TOP);
      await expect(page.getByRole('heading', { name: 'Landing sites' })).toHaveCount(0);
    });

    test('closed and zoomed in, the canvas still covers the screen and the Moon sits lower', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      const marker = page.locator('[data-site-id="im2-athena"]');
      await expect(marker).toBeVisible();
      await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
      // Measure only once the globe has placed the marker: on a slow runner the first frame can still be moving it.
      const before = await settledBox(marker);
      await tabs(page).getByRole('button', { name: 'Globe' }).click();
      await expectClosed(page);
      // The frame slides 145 px down; the marker follows it.
      await expect.poll(async () => Math.round(((await marker.boundingBox())?.y ?? 0) - (before?.y ?? 0))).toBe(145);
      await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
      for (let press = 0; press < 9; press += 1) await page.keyboard.press('+');
      await expect(page.locator('section.globe canvas')).toHaveCount(1);
      expect(await page.locator('section.globe canvas').boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
      await expect(page.locator('.globe-viewport')).not.toHaveAttribute('style', /transform/);
    });

    test('at peek only the name and the coordinates show, clear of the tab bar', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
      await page.getByRole('button', { name: /^Sheet full height/ }).press('Enter');
      await expect.poll(() => sheetTop(page)).toBe(PEEK_TOP);
      const head = await page.locator('.summary__head').boundingBox();
      const bar = await tabs(page).boundingBox();
      expect((head?.y ?? 0) + (head?.height ?? 0)).toBeLessThanOrEqual((bar?.y ?? 0) - 8);
      const shown = await page.locator('.summary > :not(.summary__head)').evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).opacity),
      );
      expect(shown.length).toBeGreaterThan(0);
      expect(shown.every((opacity) => opacity === '0')).toBe(true);
    });

    test('the sheet comes back where the session left it', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      await tabs(page).getByRole('button', { name: 'Globe' }).click();
      await expectClosed(page);
      await page.reload();
      await expectClosed(page);
    });
  });
});
