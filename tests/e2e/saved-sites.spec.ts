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
 * The globe's layers as switches and the sites saved on this device (VENT-37, part 2): each layer switched off and on
 * on the globe and the polar map, kept across a reload; saving the custom point from the card and the sheet, its
 * name, the «Saved sites» layer, the «Saved» segment of the site lists with rename, copy and delete (undo, no
 * question), its empty state, selecting a saved site, the lists marking a selected custom point; keyboard and screen
 * reader names, the production CSP, 200 % text and the pseudo-locale.
 *
 * `CAPTURE_EVIDENCE=1` also keeps screenshots in production/qa/evidence/.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-11-01';
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
/** A point near Nobile Rim 1, where the desktop framing puts the Moon in view. */
const POINT = '?lat=-85.87&lon=61.34';
const POINT_ID = '@-85.87,61.34';

/** Three saved sites, as the page keeps them (src/saved/saved-schema.ts). */
const SAVED = [
  { id: '@-85.87,61.34', name: 'Rim camp', lat: -85.87, lonEast: 61.34, savedAt: 3 },
  { id: '@-84.20,-40.00', name: 'Cabeus ridge', lat: -84.2, lonEast: -40, savedAt: 2 },
  { id: '@-88.20,170.00', name: 'Shackleton rim', lat: -88.2, lonEast: 170, savedAt: 1 },
];

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: new URL(`${DATE}-vent-37-${name}.png`, OUT).pathname });
}

/**
 * Opens the page at the fixed instant with the API stubbed and the first-time hint seen; `saved` is written once
 * into the device's storage before the first load (a reload keeps what the page wrote since).
 */
async function open(page: Page, path = './', saved?: readonly object[]): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  const sites = saved ? JSON.stringify({ v: 1, sites: saved }) : null;
  await page.addInitScript((kept) => {
    localStorage.setItem('ventana.pinHint', 'seen');
    if (kept && !sessionStorage.getItem('seeded')) {
      localStorage.setItem('ventana.savedSites', kept);
      sessionStorage.setItem('seeded', '1');
    }
  }, sites);
  await page.goto(path);
  // `:visible`: on the polar map the globe still starts, hidden, and comes first in the page.
  await expect(page.locator('.globe-viewport[data-status="ready"]:visible, .polar:visible').first()).toBeVisible({ timeout: GLOBE_START_MS });
}

/** The CSP nginx sends for the built site, as data-source.spec.ts serves it. */
async function underPolicy(page: Page): Promise<void> {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  const policy = /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
  await page.route(/\/(\?.*)?(#.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { violations: string[] }).violations = violations;
    document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { violations: string[] }).violations);

/** Whether two boxes overlap. */
function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The desktop Layers key on the view shown. */
const key = (page: Page, view = '.globe') => page.locator(`${view} .globe-layers`);

/** The marker buttons of a kind shown, other than the selected one. */
const shownMarkers = (page: Page, css: string) => page.locator(`${css}[aria-pressed="false"]:visible`);

/** The element's box once two reads 200 ms apart agree (as in phone.spec.ts). */
async function settledBox(locator: Locator): Promise<void> {
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
}

/** Opens the desktop site popover on its «Saved» segment. */
async function openSaved(page: Page): Promise<Locator> {
  await page.locator('.site-button').click();
  const popover = page.locator('#site-popover');
  await popover.getByRole('button', { name: /^Saved/ }).click();
  return popover;
}

test.describe('desktop, 1440x900: the layers', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the key holds a switch per layer, named for a screen reader, «Ghost rovers · soon» off and disabled', async ({ page }) => {
    await open(page, './', SAVED);
    const layers = key(page);
    await expect(layers.getByRole('switch', { name: 'Landing sites' })).toBeChecked();
    await expect(layers.getByRole('switch', { name: 'Approximate zones' })).toBeChecked();
    await expect(layers.getByRole('switch', { name: /^Saved sites\s*3$/ })).toBeChecked();
    const rovers = layers.getByRole('switch', { name: 'Ghost rovers · soon' });
    await expect(rovers).not.toBeChecked();
    await expect(rovers).toBeDisabled();
    await expect(layers.locator('.pin-drop')).toBeVisible();
    await expect(layers.getByRole('radiogroup')).toBeVisible();
    await evidence(page, 'layers-desktop');
  });

  test('each switch hides and shows its markers on the globe, keeping the selected one', async ({ page }) => {
    await open(page, './', SAVED);
    await expect.poll(() => shownMarkers(page, '.globe-marker--exact').count()).toBeGreaterThan(0);
    await expect.poll(() => shownMarkers(page, '.globe-marker--zone').count()).toBeGreaterThan(0);
    await expect.poll(() => page.locator('.saved-marker:visible').count()).toBeGreaterThan(0);
    // With the keyboard: Space toggles a focused switch.
    await key(page).getByRole('switch', { name: 'Landing sites' }).focus();
    await page.keyboard.press('Space');
    await expect(key(page).getByRole('switch', { name: 'Landing sites' })).not.toBeChecked();
    await expect(shownMarkers(page, '.globe-marker--exact')).toHaveCount(0);
    await expect(page.locator('.globe-marker[aria-pressed="true"]')).toBeVisible();
    await key(page).getByRole('switch', { name: 'Approximate zones' }).click();
    await expect(shownMarkers(page, '.globe-marker--zone')).toHaveCount(0);
    await key(page).getByRole('switch', { name: /^Saved sites/ }).click();
    await expect(page.locator('.saved-marker:visible')).toHaveCount(0);
    await evidence(page, 'layers-off-globe');
    await key(page).getByRole('switch', { name: 'Landing sites' }).click();
    await expect.poll(() => shownMarkers(page, '.globe-marker--exact').count()).toBeGreaterThan(0);
  });

  test('the switches apply on the polar map too, and are kept after a reload', async ({ page }) => {
    await open(page, './#polar-map', SAVED);
    const polar = key(page, '.polar');
    const exact = () => shownMarkers(page, '.polar-marker--exact').count();
    await expect.poll(exact).toBeGreaterThan(0);
    await expect.poll(() => page.locator('.polar-saved').count()).toBeGreaterThan(0);
    await polar.getByRole('switch', { name: 'Landing sites' }).click();
    await polar.getByRole('switch', { name: /^Saved sites/ }).click();
    await expect.poll(exact).toBe(0);
    await expect(page.locator('.polar-saved')).toHaveCount(0);
    await expect(shownMarkers(page, '.polar-marker--zone').first()).toBeVisible();
    await evidence(page, 'layers-off-polar');
    await page.reload();
    await expect(key(page, '.polar').getByRole('switch', { name: 'Landing sites' })).not.toBeChecked();
    await expect(key(page, '.polar').getByRole('switch', { name: 'Approximate zones' })).toBeChecked();
    await expect.poll(exact).toBe(0);
    await page.goto('./#globe');
    await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(key(page).getByRole('switch', { name: /^Saved sites/ })).not.toBeChecked();
    await expect(shownMarkers(page, '.globe-marker--exact')).toHaveCount(0);
  });
});

test.describe('desktop, 1440x900: saving a point', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('«Save» in the card keeps the point under its «Near …» name, which the field renames', async ({ page }) => {
    await open(page, `./${POINT}`);
    const card = page.getByRole('complementary', { name: 'Site card' });
    await expect(card.locator('.card-head__name')).toHaveText('Custom point');
    await card.getByRole('button', { name: 'Save' }).click();
    const saved = card.getByRole('button', { name: /^Saved/ });
    await expect(saved).toBeVisible();
    const field = card.getByRole('textbox', { name: 'Name this site' });
    await expect(field).toHaveValue('Near Nobile Rim 1');
    await expect(card).toContainText('Kept on this device only');
    await expect(card.locator('.card-head__name')).toHaveText('Near Nobile Rim 1');
    await expect(card.locator('.card-head__point')).toContainText('saved on this device');
    await evidence(page, 'save-desktop');
    await field.fill('Rim camp');
    await field.press('Enter');
    await expect(card.locator('.card-head__name')).toHaveText('Rim camp');
    await expect(page.locator('.site-button__name')).toHaveText('Rim camp');
    await expect(page).toHaveURL(/lat=-85\.87&lon=61\.34/);
    await page.reload();
    await expect(page.getByRole('complementary', { name: 'Site card' }).locator('.card-head__name')).toHaveText('Rim camp');
  });

  test('pressing «Saved» deletes it, with «Deleted … · Undo» said politely; Undo brings it back', async ({ page }) => {
    await open(page, `./${POINT}`, SAVED);
    const card = page.getByRole('complementary', { name: 'Site card' });
    await card.getByRole('button', { name: /^Saved/ }).click();
    const toast = page.getByRole('status').filter({ hasText: 'Deleted Rim camp' });
    await expect(toast).toBeVisible();
    await expect(card.getByRole('button', { name: 'Save' })).toBeVisible();
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(card.locator('.card-head__name')).toHaveText('Rim camp');
    await expect(page.locator('.undo-toast')).toHaveAttribute('data-open', 'false');
  });

  test('the saved sites stand on the globe and the polar map as silver pins; one selects its site', async ({ page }) => {
    await open(page, './', SAVED);
    const pin = page.getByRole('button', { name: 'Saved site Rim camp' });
    await expect(pin).toBeVisible();
    await evidence(page, 'saved-globe');
    // Zoomed out, Shackleton rim's 44 px target covers part of this one's: a click goes to the point nearest it.
    await pin.click({ force: true });
    await expect(page.getByRole('complementary', { name: 'Site card' }).locator('.card-head__name')).toHaveText('Rim camp');
    await expect(page).toHaveURL(/lat=-85\.87&lon=61\.34/);
    // Selected, it is the standing pin, which wears its state, and no silver one.
    await expect(page.locator('.pin')).toBeVisible();
    await expect(page.locator(`.saved-marker[data-point-id="${POINT_ID}"]`)).toHaveCount(0);
    await page.goto('./#polar-map');
    await expect(page.locator('.polar-saved').first()).toBeVisible();
    await page.getByRole('button', { name: 'Saved site Cabeus ridge' }).click();
    await expect(page.locator('.site-button__name')).toHaveText('Cabeus ridge');
    await evidence(page, 'saved-polar');
  });

  test('the «Saved» segment lists them with their state and point, checks the selected one, and selects another', async ({ page }) => {
    await open(page, `./${POINT}`, SAVED);
    const popover = await openSaved(page);
    const list = popover.getByRole('list', { name: 'Saved sites' });
    await expect(list.getByRole('listitem')).toHaveCount(3);
    const current = list.locator('[aria-current="true"]');
    await expect(current).toContainText('Rim camp');
    await expect(current.getByRole('img', { name: 'Selected' })).toBeVisible();
    await expect(list.getByRole('listitem').nth(1)).toContainText('84.20° S, 40.00° W');
    await evidence(page, 'saved-list-desktop');
    await list.getByRole('button', { name: /^Cabeus ridge/ }).click();
    await expect(page.locator('.site-button__name')).toHaveText('Cabeus ridge');
    await expect(page).toHaveURL(/lat=-84\.20&lon=-40\.00/);
  });

  test('the «…» menu by keyboard: rename in place, copy the coordinates, delete with undo', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, './', SAVED);
    const popover = await openSaved(page);
    const more = popover.getByRole('button', { name: 'More for Cabeus ridge' });
    await more.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu', { name: 'More for Cabeus ridge' });
    await expect(menu.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
    await evidence(page, 'row-menu');
    await page.keyboard.press('Enter');
    const field = popover.getByRole('textbox', { name: 'New name for Cabeus ridge' });
    await expect(field).toBeFocused();
    await field.fill('Cabeus camp');
    await page.keyboard.press('Enter');
    await expect(popover.getByRole('button', { name: /^Cabeus camp/ })).toBeVisible();
    await expect(popover.getByRole('button', { name: 'More for Cabeus camp' })).toBeFocused();
    await page.keyboard.press('Enter');
    const rename = page.getByRole('menuitem', { name: 'Rename' });
    await expect(rename).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Copy coordinates' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-pin-live]')).toHaveText('Coordinates copied: 84.20° S, 40.00° W');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('84.20° S, 40.00° W');
    await expect(popover.getByRole('button', { name: 'More for Cabeus camp' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(rename).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Deleted Cabeus camp' })).toBeVisible();
    const list = popover.getByRole('list', { name: 'Saved sites' });
    await expect(list.getByRole('listitem')).toHaveCount(2);
    // Deleted from the keyboard, the focus goes to Undo, outside the popover, which stays open.
    const undo = page.locator('.undo-toast').getByRole('button', { name: 'Undo' });
    await expect(undo).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(popover).toBeVisible();
    await expect(list.getByRole('listitem').nth(1)).toContainText('Cabeus camp');
    await expect(popover.getByRole('button', { name: /^Cabeus camp/ })).toBeFocused();
  });

  test('keyboard only: the undo of a delete is one Tab away at most, and waits while focused; Escape lets it go', async ({ page }) => {
    await open(page, './', SAVED);
    const popover = await openSaved(page);
    await popover.getByRole('button', { name: 'More for Cabeus ridge' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    const toast = page.locator('.undo-toast');
    const undo = toast.getByRole('button', { name: 'Undo' });
    await expect(undo).toBeFocused();
    // Past the five seconds, the offer still waits while the focus is on it.
    await page.waitForTimeout(5_500);
    await expect(toast).toHaveAttribute('data-open', 'true');
    await page.keyboard.press('Escape');
    await expect(toast).toHaveAttribute('data-open', 'false');
    await expect(popover).toBeVisible();
    const list = popover.getByRole('list', { name: 'Saved sites' });
    await expect(list.getByRole('listitem')).toHaveCount(2);
    // The focus is on the row now where the deleted one stood.
    await expect(popover.getByRole('button', { name: /^Shackleton rim/ })).toBeFocused();
  });

  test('pressing «Undo» with the pointer keeps the site popover open', async ({ page }) => {
    await open(page, './', SAVED);
    const popover = await openSaved(page);
    await popover.getByRole('button', { name: 'More for Cabeus ridge' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.locator('.undo-toast').getByRole('button', { name: 'Undo' }).click();
    await expect(popover).toBeVisible();
    const list = popover.getByRole('list', { name: 'Saved sites' });
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list.getByRole('listitem').nth(1)).toContainText('Cabeus ridge');
  });

  test('two deletes in a row join one offer, «Deleted 2 sites», and Undo puts both back in place', async ({ page }) => {
    await open(page, './', SAVED);
    const popover = await openSaved(page);
    const list = popover.getByRole('list', { name: 'Saved sites' });
    for (const name of ['Cabeus ridge', 'Rim camp']) {
      await popover.getByRole('button', { name: `More for ${name}` }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
    }
    await expect(list.getByRole('listitem')).toHaveCount(1);
    const toast = page.getByRole('status').filter({ hasText: 'Deleted 2 sites' });
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(3);
    const names = await list.locator('.site-row__title').allTextContents();
    expect(names).toEqual(['Rim camp', 'Cabeus ridge', 'Shackleton rim']);
    expect(await page.evaluate(() => localStorage.getItem('ventana.savedSites'))).toContain('Cabeus ridge');
  });

  test('Escape in the rename keeps the old name', async ({ page }) => {
    await open(page, './', SAVED);
    const popover = await openSaved(page);
    await popover.getByRole('button', { name: 'More for Shackleton rim' }).click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    await popover.getByRole('textbox', { name: 'New name for Shackleton rim' }).fill('Nope');
    await page.keyboard.press('Escape');
    await expect(popover.getByRole('button', { name: /^Shackleton rim/ })).toBeVisible();
  });

  test('with none saved the segment says how to save one; the lists mark a selected custom point', async ({ page }) => {
    await open(page, `./${POINT}`);
    await page.locator('.site-button').click();
    const popover = page.locator('#site-popover');
    const current = popover.getByRole('list', { name: 'Sites' }).locator('[aria-current="true"]');
    await expect(current).toContainText('Custom point');
    await expect(current.getByRole('img', { name: 'Selected' })).toBeVisible();
    await popover.getByRole('button', { name: 'Saved, 0 sites' }).click();
    await expect(popover).toContainText('No saved sites yet');
    await expect(popover).toContainText('Drop a pin on the Moon and tap Save to keep a site here');
  });

  test('the production CSP allows the switches, the save, the menu and the undo', async ({ page }) => {
    await underPolicy(page);
    await open(page, `./${POINT}`);
    await key(page).getByRole('switch', { name: 'Approximate zones' }).click();
    await page.getByRole('complementary', { name: 'Site card' }).getByRole('button', { name: 'Save' }).click();
    const popover = await openSaved(page);
    await popover.getByRole('button', { name: 'More for Near Nobile Rim 1' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.locator('.undo-toast').getByRole('button', { name: 'Undo' }).click();
    await page.waitForTimeout(300);
    expect(await violations(page)).toEqual([]);
  });

  test('at 200 % text the first-time hint never covers the Layers key, on the globe or the polar map', async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    for (const [path, view] of [['./', '.globe'], ['./#polar-map', '.polar']] as const) {
      await page.goto(path);
      await expect(page.locator(`${view} .pin-hint`)).toBeVisible({ timeout: GLOBE_START_MS });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      const layers = key(page, view);
      if (!(await layers.isVisible())) continue;
      await page.waitForTimeout(200);
      const hint = (await page.locator(`${view} .pin-hint`).boundingBox())!;
      expect(overlaps(hint, (await layers.boundingBox())!)).toBe(false);
      if (view === '.globe') await evidence(page, 'hint-200-text');
    }
  });

  test('in the pseudo-locale the switches and «Save» stay whole', async ({ page }) => {
    await open(page, `./en-xa/${POINT}`);
    const layers = key(page);
    const box = (await layers.boundingBox())!;
    for (const row of await layers.locator('.layer-row__label').all()) {
      const own = (await row.boundingBox())!;
      expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    }
    const save = page.locator('.site-card .save-button');
    expect(await save.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await evidence(page, 'en-xa-layers');
  });
});

/** A saved name at the longest a name can be, 60 characters. */
const LONG_NAME = 'Shackleton connecting ridge, sunlit camp for the polar night';

for (const width of [1440, 1280]) {
  test.describe(`desktop, ${width}x900: a long saved name`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('stays on one header row, cut with an ellipsis and whole in the name and title; a row keeps its point whole', async ({ page }) => {
      expect(LONG_NAME).toHaveLength(60);
      await open(page, `./${POINT}`, [{ ...SAVED[0], name: LONG_NAME }, ...SAVED.slice(1)]);
      const button = page.locator('.site-button');
      const name = button.locator('.site-button__name');
      await expect(name).toHaveText(LONG_NAME);
      await expect(button).toHaveAccessibleName(new RegExp(LONG_NAME));
      await expect(button).toHaveAttribute('title', new RegExp(LONG_NAME));
      expect(await name.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      expect(await name.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
      // One row: the site button, the titles and the view tabs share a line.
      const centre = async (css: string) => {
        const box = (await page.locator(css).first().boundingBox())!;
        return box.y + box.height / 2;
      };
      const tabs = await centre('.bar .views');
      expect(Math.abs((await centre('.site-button')) - tabs)).toBeLessThan(8);
      expect(Math.abs((await centre('.bar .titles')) - tabs)).toBeLessThan(8);
      const bar = (await page.locator('.bar').boundingBox())!;
      expect(bar.height).toBeLessThan(80);
      const popover = await openSaved(page);
      const coords = popover.locator('.saved-row__coords');
      await expect(coords).toHaveCount(3);
      for (const one of await coords.all()) {
        expect(await one.evaluate((el) => el.getClientRects().length)).toBe(1);
      }
    });
  });
}

test.describe('phone, 390x844: layers and saved sites', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** Opens the Sites sheet from the tab bar. */
  const sitesSheet = async (page: Page): Promise<Locator> => {
    await page.getByRole('button', { name: 'Sites', exact: true }).click();
    const sheet = page.locator('.picker');
    await expect(sheet).toBeVisible();
    return sheet;
  };

  test('the Sites sheet groups the layers as switches; with none saved, the row says how to save one', async ({ page }) => {
    await open(page);
    const sheet = await sitesSheet(page);
    const group = sheet.getByRole('region', { name: 'Layers' });
    await expect(group.getByRole('switch')).toHaveCount(4);
    const saved = group.getByRole('switch', { name: 'Saved sites' });
    await expect(saved).toBeChecked();
    await expect(saved).toHaveAccessibleDescription('Drop a pin on the Moon and tap Save to keep a site here');
    await evidence(page, 'layers-phone');
    await sheet.getByRole('button', { name: 'Saved, 0 sites' }).click();
    await expect(sheet).toContainText('No saved sites yet');
    await sheet.locator('.saved-empty').scrollIntoViewIfNeeded();
    await evidence(page, 'empty-phone');
    await group.getByRole('switch', { name: 'Approximate zones' }).click();
    await expect(group.getByRole('switch', { name: 'Approximate zones' })).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('ventana.layers'))).toContain('"approximate-zones":false');
  });

  test('«Save» in the sheet head keeps the custom point; the «Saved» segment lists it, checked', async ({ page }) => {
    await open(page, `./${POINT}`);
    const summary = page.locator('.summary');
    await summary.getByRole('button', { name: 'Save' }).click();
    await expect(summary.getByRole('button', { name: /^Saved/ })).toBeVisible();
    await expect(summary.getByRole('textbox', { name: 'Name this site' })).toHaveValue('Near Nobile Rim 1');
    await expect(page.locator('.site-pill')).toContainText('Near Nobile Rim 1');
    await evidence(page, 'save-phone');
    const sheet = await sitesSheet(page);
    const list = sheet.getByRole('list', { name: 'Saved sites' });
    await expect(list.locator('[aria-current="true"]')).toContainText('Near Nobile Rim 1');
  });

  test('a delete from the «…» menu asks nothing and offers Undo above the tab bar', async ({ page }) => {
    await open(page, `./${POINT}`, SAVED);
    const sheet = await sitesSheet(page);
    const list = sheet.getByRole('list', { name: 'Saved sites' });
    // The picker opens on «Saved» while a saved site is selected.
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await evidence(page, 'saved-list-phone');
    // The menu is placed under its button when it opens: the sheet must have stopped rising, or the menu lands where
    // the button was, below the screen.
    const more = sheet.getByRole('button', { name: 'More for Cabeus ridge' });
    await settledBox(more);
    await more.click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(2);
    const toast = page.locator('.undo-toast');
    await expect(toast).toContainText('Deleted Cabeus ridge');
    const tabs = (await page.locator('.tab-bar').boundingBox())!;
    const box = (await toast.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(tabs.y);
    await evidence(page, 'delete-undo-phone');
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(3);
  });

  test('a saved site picked in the list is selected, and the sheet opens on its answer', async ({ page }) => {
    await open(page, './', SAVED);
    const sheet = await sitesSheet(page);
    await sheet.getByRole('button', { name: 'Saved, 3 sites' }).click();
    await sheet.getByRole('button', { name: /^Shackleton rim/ }).click();
    await expect(page.locator('.summary__name')).toHaveText('Shackleton rim');
    await expect(page).toHaveURL(/lat=-88\.20&lon=170\.00/);
  });
});
