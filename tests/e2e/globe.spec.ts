import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// The real site list, as the API serves it (`{ sites }`), for the runs that stub the API.
const SITES = JSON.parse(readFileSync(new URL('../../packages/server/data/sites.json', import.meta.url), 'utf8')) as {
  approximate: boolean;
}[];
// Requests only the desktop globe makes: its chunk (Three.js inside) and the Moon texture.
const GLOBE_ASSET = /\/_astro\/globe\.[^/]*\.js$|\/textures\/moon-lroc-/;
// Chromium's own line for a failed request; the page cannot silence it, so the unreachable-API test allows it.
const NETWORK_LINE = /^Failed to load resource/;

function collectConsole(page: Page): { errors: string[]; warnings: string[] } {
  const log = { errors: [] as string[], warnings: [] as string[] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') log.errors.push(m.text());
    if (m.type() === 'warning') log.warnings.push(m.text());
  });
  return log;
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('draws the globe with the API sites and logs no errors', async ({ page }) => {
    await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
    const log = collectConsole(page);
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('./');
    const globe = page.getByRole('region', { name: 'Lunar globe' });
    await expect(globe.locator('canvas')).toHaveCount(1);
    await expect(globe.locator('.globe-marker')).toHaveCount(SITES.length);
    await expect(globe.locator('.globe-marker--zone')).toHaveCount(SITES.filter((s) => s.approximate).length);
    await expect(globe.locator('.globe-label')).toHaveText('Mons Mouton (IM-2 Athena)');
    await expect(globe.locator('.globe-label')).toBeVisible();
    expect(log.errors).toEqual([]);
    // The phone test below looks for these same requests: here they must happen.
    expect(requested.filter((url) => GLOBE_ASSET.test(url))).toHaveLength(2);
  });

  test('still draws without the API: no markers and one clear warning', async ({ page }) => {
    const log = collectConsole(page);
    const sites = page.waitForResponse('**/api/v1/sites');
    await page.goto('./');
    const globe = page.getByRole('region', { name: 'Lunar globe' });
    await expect(globe.locator('canvas')).toHaveCount(1);
    await sites;
    await expect.poll(() => log.warnings.filter((w) => w.includes('no landing sites')).length).toBe(1);
    await expect(globe.locator('.globe-marker')).toHaveCount(0);
    expect(log.errors.filter((e) => !NETWORK_LINE.test(e))).toEqual([]);
  });

  test('selecting a site names it in the label', async ({ page }) => {
    await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
    await page.goto('./');
    await page.getByRole('button', { name: /Malapert A region \(IM-1 Odysseus\)/ }).click();
    await expect(page.locator('.globe-label')).toHaveText('Malapert A region (IM-1 Odysseus)');
  });

  test('the viewport is focusable and turns with the arrow keys', async ({ page }) => {
    await page.goto('./');
    const viewport = page.getByRole('application', { name: 'The Moon, seen over its south pole' });
    await expect(viewport).toHaveAttribute('aria-describedby', 'globe-help');
    await expect(page.locator('#globe-help')).toContainText('Lit by the Sun as of');
    await viewport.focus();
    await page.keyboard.press('ArrowRight');
    await expect(viewport).toBeFocused();
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('hides the globe and never downloads Three.js or the texture', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ventana Lunar');
    await expect(page.locator('section.globe')).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(requested.filter((url) => GLOBE_ASSET.test(url))).toEqual([]);
  });
});
