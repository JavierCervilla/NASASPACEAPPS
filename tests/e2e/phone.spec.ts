import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

// Requests only the globe makes: its chunk (Three.js inside) and the Moon texture.
const GLOBE_ASSET = /\/_astro\/globe\.[^/]*\.js$|\/textures\/moon-lroc-/;
// The canvas's date, so the widgets read the same in every run; IM-2 answers real data for it (api-stub.ts).
const NOW = new Date('2026-11-23T18:00:00Z');
// Where the sheet's top edge rests at 390x844: half shows 344 px, full sits under the 96 px of the top bar.
const HALF_TOP = 844 - 344;
const FULL_TOP = 96;

async function open(page: Page): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto('./');
}

const sheetTop = (page: Page) => page.locator('.sheet').evaluate((el) => Math.round(el.getBoundingClientRect().top));

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('draws the globe under the glass bar, with the sheet at half and four widgets', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ventana Lunar');
    await expect(page.locator('section.globe canvas')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Change site, now IM-2, Mons Mouton', exact: true })).toBeVisible();
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
    await expect(page.locator('.globe-label')).toHaveText('Mons Mouton (IM-2 Athena)');
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

  test('the globe label stays above the sheet, and hides when the sheet covers its marker', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const label = page.locator('.globe-label');
    await expect(label).toBeVisible();
    const box = await label.boundingBox();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(HALF_TOP);
    await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
    await expect.poll(() => sheetTop(page)).toBe(FULL_TOP);
    await expect(label).toBeHidden();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(label).toBeVisible();
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
    await expect.poll(() => sheetTop(page)).toBe(844 - 136);
  });

  test('search spans every region and names it; with the query cleared the region control filters', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Change site, now IM-2' }).click();
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
    await expect(page.getByRole('button', { name: 'Change site, now Apollo 11, Mare Tranquillitatis (Tranquility Base)' })).toBeVisible();
    await expect(page.locator('.widget').first()).toContainText('No window');
    await expect(page.locator('.widget').nth(3)).toContainText('No antenna');
    await expect(page.locator('[data-site-id="apollo11"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.globe-label')).toHaveText('Mare Tranquillitatis (Tranquility Base) (Apollo 11)');
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
  });

  test('reaches the Mons Mouton zone that the globe hides under IM-2', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Change site, now IM-2' }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mons Mouton\s*Artemis candidate region/ }).click();
    // The pill and the title tell the zone apart from IM-2, which shares the place name.
    await expect(page.getByRole('button', { name: 'Change site, now Mons Mouton, Artemis candidate region', exact: true })).toBeVisible();
    await expect(page.locator('.site-pill__detail')).toHaveText('Artemis candidate region');
    await expect(page.locator('.summary__name')).toHaveText('Mons Mouton');
    await expect(page.locator('.summary__subtitle')).toHaveText('Artemis candidate region');
    const zone = page.locator('[data-site-id="artemis-mons-mouton-plateau"]');
    await expect(zone).toHaveAttribute('aria-pressed', 'true');
    await expect(zone).toBeVisible();
  });

  test('shows skeletons while the API is slow, then an honest error when it fails', async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    let answer = (): void => undefined;
    await stubApi(page, { status: 502, hold: new Promise<void>((done) => (answer = done)) });
    await page.goto('./');
    await expect(page.getByRole('list', { name: 'Loading this site' })).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('.widget-skeleton')).toHaveCount(4);
    answer();
    await expect(page.getByRole('alert')).toContainText('could not load');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
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

  test('Calendar and Horizon say soon and do nothing', async ({ page }) => {
    await open(page);
    const calendar = page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Calendar (soon)' });
    await expect(calendar).toHaveAttribute('aria-disabled', 'true');
    // Playwright treats aria-disabled as disabled and would wait: the tap is forced, as a finger would.
    await calendar.click({ force: true });
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
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
});
