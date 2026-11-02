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
 * The on-foot 3D view (VENT-34, the human's verdict): the «Horizon» tab opens the selected point from the ground in
 * third person, with «Third person | First person»; the relief comes from the stubbed `/api/v1/terrain/tile`, the far
 * horizon from the point's profile, so the Sun is drawn hidden exactly where the profile hides it; the caption says
 * what is illustrative; an idle view draws no frames; and none of the view's files is in the first load.
 *
 * At 85.50° S 40.00° E on 22 November 2026 at 20:00 UTC the Sun stands 5.7° up at 339° and the Earth 9.1° up at 314°
 * (api-stub.ts); the view opens toward the Sun.
 */
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { stubApi } from './api-stub';
import { stubRealRelief, stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-22T20:00:00Z');
/** IM-2 with the Sun just over its ridge (horizon.spec.ts), on the recorded LOLA relief (terrain-stub.ts). */
const RIDGE_AT = new Date('2026-11-30T20:00:00Z');
const POINT = '?lat=-85.50&lon=40.00';
const SHOTS = process.env.VENT34_SHOTS;
/** The view's files, never in the first load (scripts/service-worker.mjs ON_DEMAND). */
const VIEW_FILES = /\/_astro\/(TerrainPanel|terrain-scene|on-foot|astronaut)\.|\/api\/v1\/terrain\/tile/;
const START_MS = 30_000;

interface Open {
  readonly path: string;
  /** The wall of the point's horizon, degrees of azimuth. */
  readonly wall?: readonly [number, number];
  readonly requests?: string[];
  /** The recorded LOLA relief of IM-2 instead of the synthetic one, at this instant. */
  readonly real?: Date;
}

async function open(page: Page, { path, wall = [300, 330], requests, real }: Open): Promise<void> {
  await page.clock.setFixedTime(real ?? AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  if (requests) page.on('request', (request) => requests.push(request.url()));
  await stubApi(page);
  if (real) await stubRealRelief(page);
  else {
    await stubWall(page, ...wall);
    await stubTile(page);
  }
  await page.goto(path);
}

const view = (page: Page) => page.getByRole('region', { name: 'On foot at the site' });
const host = (page: Page) => view(page).getByRole('application', { name: 'On foot at the site' });

/** Waits until the scene stands (the astronaut loaded) and has drawn. */
async function settled(page: Page): Promise<void> {
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(0);
}

const frames = async (page: Page): Promise<number> => Number(await host(page).getAttribute('data-frames'));

/** Waits until no frame has been drawn for 600 ms (a resize or the sheet settling), and returns the count. */
async function idle(page: Page): Promise<number> {
  let last = -1;
  await expect
    .poll(async () => {
      const now = await frames(page);
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [600], timeout: 15_000 })
    .toBe(true);
  return last;
}

/** The brightest channel around «x,y» on the screen, 0 to 255. */
async function brightness(page: Page, at: string): Promise<number> {
  const box = await host(page).boundingBox();
  const [x, y] = at.split(',').map(Number) as [number, number];
  const clip = { x: (box?.x ?? 0) + x - 2, y: (box?.y ?? 0) + y - 2, width: 5, height: 5 };
  const raw = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer();
  return Math.max(...raw);
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the Horizon tab opens in third person, toggles to first person, and says what is illustrative', async ({ page }) => {
    const requests: string[] = [];
    await open(page, { path: `./${POINT}`, requests });
    await expect(page.locator('.globe-viewport')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requests.filter((url) => VIEW_FILES.test(url))).toEqual([]);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
    await expect(page).toHaveURL(/#horizon$/);
    await settled(page);
    expect(requests.some((url) => /terrain-scene\./.test(url))).toBe(true);
    await expect(host(page)).toHaveAttribute('data-mode', 'third');
    const modes = view(page).getByRole('radiogroup', { name: 'Camera' });
    await expect(modes.getByRole('radio', { name: 'Third person' })).toHaveAttribute('aria-checked', 'true');
    await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 20 m');
    await expect(view(page)).toContainText('Lander: placeholder model');
    await expect(view(page).getByRole('region', { name: 'Horizon' })).toBeVisible();
    await expect(view(page).locator('.on-foot__label--ring').first()).toBeVisible();
    await shot(page, 'synthetic-desktop-third');
    await modes.getByRole('radio', { name: 'First person' }).click();
    await expect(host(page)).toHaveAttribute('data-mode', 'first');
    await shot(page, 'synthetic-desktop-first');
  });

  test('an idle view draws no frames; a key turns it and draws again', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon` });
    await settled(page);
    const settledAt = await idle(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(settledAt);
    await host(page).focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => frames(page)).toBeGreaterThan(settledAt);
    await expect(host(page)).toHaveAccessibleDescription(/View heading 334°, to the north-west\. .*The Sun is to the north, above the terrain\./);
  });

  test('the Sun is drawn where the profile shows it', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon` });
    await settled(page);
    await idle(page);
    const shown = (await host(page).getAttribute('data-sun-at')) ?? '';
    expect(shown).not.toBe('');
    expect(await brightness(page, shown)).toBeGreaterThan(200);
  });

  test('the Sun is drawn hidden behind the far horizon where the profile hides it', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon`, wall: [330, 350] });
    await settled(page);
    await idle(page);
    await expect(host(page)).toHaveAccessibleDescription(/The Sun is to the north, hidden by the terrain\. Terrain more than 2 km away hides the Sun\./);
    const hidden = (await host(page).getAttribute('data-sun-at')) ?? '';
    expect(hidden).not.toBe('');
    expect(await brightness(page, hidden)).toBeLessThan(80);
    await shot(page, 'desktop-sun-hidden');
  });

  test('IM-2 on its real LOLA relief: the Sun just over the ridge, the shipped skyline behind', async ({ page }) => {
    await open(page, { path: './?site=im2-athena#horizon', real: RIDGE_AT });
    await settled(page);
    await idle(page);
    await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 20 m');
    await expect(host(page)).toHaveAccessibleDescription(/The Sun is to the .*, above the terrain\./);
    await shot(page, 'desktop-third');
    await view(page).getByRole('radio', { name: 'First person' }).click();
    await expect(host(page)).toHaveAttribute('data-mode', 'first');
    await shot(page, 'desktop-first');
  });

  test('says so when the server has no terrain for the point, and offers no 3D', async ({ page }) => {
    await page.clock.setFixedTime(AT);
    await stubApi(page);
    await stubTile(page, { status: 404, error: 'no terrain data covers this point' });
    await page.goto(`./${POINT}#horizon`);
    await expect(view(page).getByRole('status')).toHaveText('No terrain covers this point on the server');
    await expect(host(page).locator('canvas')).toHaveCount(0);
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the Horizon tab fills the screen with the ground, third person first, the sheet at peek', async ({ page }) => {
    const requests: string[] = [];
    await open(page, { path: `./${POINT}`, requests });
    await page.waitForLoadState('networkidle');
    expect(requests.filter((url) => VIEW_FILES.test(url))).toEqual([]);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
    await expect(page).toHaveURL(/#horizon$/);
    await settled(page);
    await expect(host(page)).toHaveAttribute('data-mode', 'third');
    await expect(page.locator('.globe')).toBeHidden();
    await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 20 m');
    const radio = view(page).getByRole('radio', { name: 'First person' });
    const size = await radio.boundingBox();
    expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
    await shot(page, 'synthetic-phone-third');
    await radio.tap();
    await expect(host(page)).toHaveAttribute('data-mode', 'first');
    const still = await idle(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(still);
    await shot(page, 'synthetic-phone-first');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.globe')).toBeVisible();
    await expect(view(page)).toHaveCount(0);
  });

  test('IM-2 on its real LOLA relief, third person then first, the sheet at peek', async ({ page }) => {
    await open(page, { path: './?site=im2-athena', real: RIDGE_AT });
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
    await settled(page);
    await idle(page);
    await expect(host(page)).toHaveAttribute('data-mode', 'third');
    await shot(page, 'phone-third');
    await view(page).getByRole('radio', { name: 'First person' }).tap();
    await expect(host(page)).toHaveAttribute('data-mode', 'first');
    await idle(page);
    await shot(page, 'phone-first');
  });
});
