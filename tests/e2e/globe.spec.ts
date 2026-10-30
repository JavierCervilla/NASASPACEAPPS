import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// The real site list, as the API serves it (`{ sites }`), for the runs that stub the API.
const SITES = JSON.parse(readFileSync(new URL('../../packages/server/data/sites.json', import.meta.url), 'utf8')) as {
  name: string;
  lat: number;
  lonEast: number;
  approximate: boolean;
}[];
// Sites that share a point share one marker, which is a zone only when all of them are zones.
const POINTS = new Map<string, typeof SITES>();
for (const site of SITES) POINTS.set(`${site.lat},${site.lonEast}`, [...(POINTS.get(`${site.lat},${site.lonEast}`) ?? []), site]);
const ZONE_POINTS = [...POINTS.values()].filter((group) => group.every((s) => s.approximate));
const IM2 = '[data-site-id="im2-athena"]';
// A merged zone (Griffin-1 and Nobile Rims 1 and 2) whose ring falls inside IM-2's hit box at the opening view.
const NOBILE = '[data-site-id="griffin1-nobile"]';
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
    await expect(globe.locator('.globe-marker')).toHaveCount(POINTS.size);
    await expect(globe.locator('.globe-marker--zone')).toHaveCount(ZONE_POINTS.length);
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

  test('selecting a site names it in the label, which sits on its marker', async ({ page }) => {
    await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
    await page.goto('./');
    const im1 = page.getByRole('button', { name: /Malapert A region \(IM-1 Odysseus\)/ });
    await im1.click();
    await expect(page.locator('.globe-label')).toHaveText('Malapert A region (IM-1 Odysseus)');
    const transform = (selector: string) => page.locator(selector).evaluate((el) => (el as HTMLElement).style.transform);
    await expect.poll(() => transform('.globe-label')).toBe(await transform('[data-site-id="im1-odysseus"]'));
    expect(await transform('.globe-label')).toMatch(/^translate3d\(/);
  });

  test('IM-2 is what sits under its own centre, and a mouse click there selects it', async ({ page }) => {
    await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
    await page.goto('./');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/);
    await page.getByRole('button', { name: /Malapert A region \(IM-1 Odysseus\)/ }).click();
    await expect(page.locator(IM2)).toHaveAttribute('aria-pressed', 'false');
    const box = await page.locator(IM2).boundingBox();
    const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
    const hit = await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.dataset['siteId'], centre);
    expect(hit).toBe('im2-athena');
    await page.mouse.click(centre.x, centre.y);
    await expect(page.locator(IM2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.globe-label')).toHaveText('Mons Mouton (IM-2 Athena)');
  });

  test('a zone ring under another marker stays in the DOM, hidden, and shows on zoom', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
    await page.goto('./');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/);
    await expect(page.locator(NOBILE)).toHaveCount(1);
    await expect(page.locator(NOBILE)).toBeHidden();
    await expect(page.locator('.globe-marker')).toHaveCount(POINTS.size);
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 6; press += 1) await page.keyboard.press('+');
    await expect(page.locator(NOBILE)).toBeVisible();
  });

  test('the viewport is focusable and turns with the arrow keys', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/v1/sites', (route) => route.fulfill({ json: { sites: SITES } }));
    await page.goto('./');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/);
    const before = await page.locator(IM2).evaluate((el) => (el as HTMLElement).style.transform);
    const viewport = page.getByRole('application', { name: 'The Moon, seen over its south pole' });
    await expect(viewport).toHaveAttribute('aria-describedby', 'globe-help');
    await expect(page.locator('#globe-help')).toContainText('Lit by the Sun as of');
    await viewport.focus();
    await page.keyboard.press('ArrowRight');
    await expect(viewport).toBeFocused();
    // Under reduced motion the turn lands at once: the next frame moves the marker.
    await expect.poll(() => page.locator(IM2).evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before);
  });

  test('hides the phone list of sites', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('section.globe')).toBeVisible();
    await expect(page.locator('.sites-mobile')).toBeHidden();
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

  test('says the globe is on larger screens and lists the landing sites by name', async ({ page }) => {
    await page.goto('./');
    const list = page.getByRole('region', { name: 'Landing sites' });
    await expect(list).toBeVisible();
    await expect(list).toContainText('The 3D globe opens on larger screens.');
    await expect(list.getByRole('listitem')).toHaveText(SITES.map((s) => s.name));
  });
});
