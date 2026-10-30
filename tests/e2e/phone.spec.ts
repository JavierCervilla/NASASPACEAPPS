import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

// Requests only the globe makes: its chunk (Three.js inside) and the Moon texture.
const GLOBE_ASSET = /\/_astro\/globe\.[^/]*\.js$|\/textures\/moon-lroc-/;
// The canvas's date, so the widgets read the same in every run.
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
    await expect(page.getByRole('button', { name: 'Change site, now IM-2' })).toBeVisible();
    const widgets = page.getByRole('list', { name: 'This site now' }).getByRole('listitem');
    await expect(widgets).toHaveCount(4);
    await expect(widgets.nth(0)).toContainText('Landing window');
    await expect(widgets.nth(0)).toContainText('100 % of November');
    await expect(widgets.nth(1)).toContainText('Sunset in');
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

  test('search and the region control filter the list', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Change site, now IM-2' }).click();
    const rows = page.getByRole('list', { name: 'Sites' }).getByRole('listitem');
    await expect(rows).toHaveCount(16);
    await page.getByRole('searchbox', { name: 'Search a site or mission' }).fill('mouton');
    await expect(rows).toHaveCount(4);
    await page.getByRole('searchbox', { name: 'Search a site or mission' }).fill('');
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await expect(rows).toHaveCount(6);
    await page.getByRole('searchbox', { name: 'Search a site or mission' }).fill('fra mauro');
    await expect(rows).toHaveCount(1);
  });

  test('choosing a site changes the pill, the widgets and the globe', async ({ page }) => {
    await open(page);
    await expect(page.locator('.widget').first()).toContainText('Landing window');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.getByRole('button', { name: 'Change site, now Apollo 11' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Change site, now Mons Mouton' })).toBeVisible();
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
