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
 * The scanned rocks (VENT-124) on a phone at the medium tier (412x915), on IM-2's recorded relief at 2026-11-20 12:00
 * UTC, looking down at the ground near the eye. Before VENT-124 the near rocks stood on the near grid (15.6 m) while
 * the medium tier draws ring level 0 at every second node (31 m): on IM-2's convex relief they sank under the drawn
 * ground and the near ground looked the same with the rocks or without them. Now the rocks stand on the drawn ground,
 * so the default (the scans) and `?rocks=stones` both differ near the eye from `?onfoot=rocks`. The rock files come
 * only with the view (never in the first load nor the precache), the caption credits them only when they are drawn, an
 * idle view draws no frames, and a point change keeps the scans' textures (made once per view, not per point).
 */
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { stubApi } from './api-stub';
import { stubRealRelief, stubTile, stubWall } from './terrain-stub';
import { idleCount } from './view-idle';

const AT = new Date('2026-11-20T12:00:00Z');
const START_MS = 60_000;
const ROCK_FILES = /\/_astro\/on-foot-rock/;
const CREDIT = 'Rocks: NASA Astromaterials 3D (Apollo 17)';
/** Arrow presses down (3° each): the ground within about 15 m fills the view. */
const PITCH_DOWN = 16;
/** A pixel differs when a channel moves by more than this (0 to 255). */
const PIXEL_JUMP = 40;
/** Pixels of the free band that must differ: the near rocks; before the fix, 0. */
const NEAR_ROCK_PIXELS = 150;
/** Pixels that may differ between the stones and the scans' fallback stones: the same rocks, drawn in two meshes. */
const STONES_ALIKE = 50;

const PHONE = { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true };

const host = (page: Page) => page.locator('.on-foot__host');

/** Every rock file the page asks for. */
function rockRequests(page: Page): string[] {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (ROCK_FILES.test(request.url())) asked.push(request.url());
  });
  return asked;
}

async function load(page: Page, query: string): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    localStorage.setItem('ventana.walkHint', 'seen');
  });
  await stubApi(page);
  await stubRealRelief(page);
  await page.goto(`./?site=im2-athena&quality=medium${query}`);
}

async function openHorizon(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await idleCount(host(page));
}

/**
 * The ground looking down, as raw RGB of the free band between the top bar and the sheet, with the view's own
 * overlays (caption, compass, labels) hidden: what is left is the ground and what stands on it.
 */
async function nearGround(page: Page): Promise<Buffer> {
  await host(page).focus();
  for (let k = 0; k < PITCH_DOWN; k++) await page.keyboard.press('ArrowDown');
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await idleCount(host(page));
  await page.addStyleTag({ content: '.on-foot__host > :not(canvas), .on-foot__top, .on-foot .compass { visibility: hidden !important; }' });
  const bar = (await page.locator('.phone-bar').boundingBox())!;
  const sheetTop = await page.evaluate(() => document.querySelector('.sheet')?.getBoundingClientRect().top ?? innerHeight);
  const top = Math.ceil(bar.y + bar.height);
  const png = await page.screenshot({ clip: { x: 0, y: top, width: 412, height: Math.floor(sheetTop) - top } });
  if (process.env.VENT124_DEBUG) await sharp(png).toFile(`${process.env.VENT124_DEBUG}/${Date.now()}.png`);
  return sharp(png).removeAlpha().raw().toBuffer();
}

const differing = (a: Buffer, b: Buffer): number => {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 3) {
    const jump = Math.max(Math.abs((a[i] ?? 0) - (b[i] ?? 0)), Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)),
      Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0)));
    if (jump > PIXEL_JUMP) n++;
  }
  return n;
};

async function nearGroundOf(page: Page, query: string) {
  await load(page, query);
  await openHorizon(page);
  return nearGround(page);
}

test.describe('on a phone at medium', () => {
  test.use(PHONE);

  test('the near rocks show at the medium tier: scans and stones both differ near the eye from no rocks', async ({ page }) => {
    test.setTimeout(240_000);
    const bare = await nearGroundOf(page, '&onfoot=rocks');
    const scans = await nearGroundOf(page, '');
    const stones = await nearGroundOf(page, '&rocks=stones');
    expect(differing(scans, bare), 'the scans near the eye').toBeGreaterThan(NEAR_ROCK_PIXELS);
    expect(differing(stones, bare), 'the stones near the eye').toBeGreaterThan(NEAR_ROCK_PIXELS);
  });

  test('the rock files come only with the view, and the caption credits them', async ({ page }) => {
    test.setTimeout(120_000);
    const asked = rockRequests(page);
    await load(page, '');
    await expect(page.locator('.site-pill')).toBeVisible();
    expect(asked, 'no rock file in the first load').toEqual([]);
    const worker = await (await page.request.get('./sw.js')).text();
    const precache = /precache:`([^`]*)`/.exec(worker)?.[1] ?? '';
    expect(precache, 'the worker has a precache list').toContain('manifest.webmanifest');
    expect(precache, 'no rock file in the precache').not.toMatch(/on-foot-rock/);
    await openHorizon(page);
    expect(asked.filter((url) => /\.bin$/.test(url))).toHaveLength(1);
    expect(asked.filter((url) => /\.webp$/.test(url))).toHaveLength(4);
    await expect(page.locator('.on-foot__caption-note')).toContainText(CREDIT);
    const frames = await idleCount(host(page));
    await page.waitForTimeout(1500);
    expect(Number(await host(page).getAttribute('data-frames')), 'an idle view draws no frames').toBe(frames);
  });

  // VENT-127: refused rock files used to drop the held nearest rocks (the ground near the eye went bare) and the
  // caption still credited the scans. Now the held rocks are built as stones and the credit goes.
  test('when the rock files are refused the near rocks are stones and the caption credits none', async ({ page }) => {
    test.setTimeout(240_000);
    const bare = await nearGroundOf(page, '&onfoot=rocks');
    const stones = await nearGroundOf(page, '&rocks=stones');
    let refused = 0;
    await page.route(ROCK_FILES, (route) => (refused++, route.abort()));
    const fallback = await nearGroundOf(page, '');
    expect(refused, 'the rock files were asked and refused').toBeGreaterThan(0);
    expect(differing(fallback, bare), 'the near rocks are drawn').toBeGreaterThan(NEAR_ROCK_PIXELS);
    expect(differing(fallback, stones), 'drawn as the stones').toBeLessThan(STONES_ALIKE);
    // nearGround hid the overlays for its picture: the caption is read, not seen.
    await expect(page.locator('.on-foot__caption-note')).toContainText('Earth: NASA Blue Marble');
    await expect(page.locator('.on-foot__caption-note')).not.toContainText('Rocks:');
  });

  for (const query of ['&rocks=stones', '&onfoot=rocks']) {
    test(`with ${query.slice(1)} no rock file is asked and the caption credits none`, async ({ page }) => {
      test.setTimeout(120_000);
      const asked = rockRequests(page);
      await load(page, query);
      await openHorizon(page);
      expect(asked).toEqual([]);
      await expect(page.locator('.on-foot__caption-note')).toBeVisible();
      await expect(page.locator('.on-foot__caption-note')).not.toContainText('Rocks:');
    });
  }
});

/** GPU textures and buffers made and not deleted yet, counted from the WebGL calls. */
async function countGpu(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const held = { textures: 0, buffers: 0 };
    (window as unknown as { __held: typeof held }).__held = held;
    const proto = WebGL2RenderingContext.prototype;
    const count = (make: 'createTexture' | 'createBuffer', drop: 'deleteTexture' | 'deleteBuffer', key: 'textures' | 'buffers') => {
      const made = proto[make];
      proto[make] = function (this: WebGL2RenderingContext) {
        held[key] += 1;
        return made.call(this);
      } as never;
      const dropped = proto[drop] as (this: WebGL2RenderingContext, thing: unknown) => void;
      proto[drop] = function (this: WebGL2RenderingContext, thing: unknown) {
        if (thing) held[key] -= 1;
        return dropped.call(this, thing);
      } as never;
    };
    count('createTexture', 'deleteTexture', 'textures');
    count('createBuffer', 'deleteBuffer', 'buffers');
  });
}

const held = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __held: { textures: number; buffers: number } }).__held }));

// On the synthetic relief at the desktop's medium tier (a point change needs the site list; the recorded relief answers
// IM-2's tiles for any point). The scans' maps and shapes are made once per view: a point change and its way back hold
// what they held, and leaving the view frees every buffer it made (before VENT-124's fix the instance matrices stayed).
test('a point change and back holds the same GPU memory, and leaving the view frees it', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await countGpu(page);
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    localStorage.setItem('ventana.walkHint', 'seen');
  });
  await stubApi(page);
  await stubTile(page);
  await stubWall(page, 100, 140);
  const asked = rockRequests(page);
  await page.goto('./?site=im2-athena&quality=medium');
  await page.waitForTimeout(3000);
  const globeOnly = await held(page);
  const views = page.getByRole('navigation', { name: 'View' });
  const settle = async () => {
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    await expect(host(page)).not.toHaveAttribute('data-parked', 'true', { timeout: START_MS });
    await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
    await idleCount(host(page));
  };
  const pick = async (name: RegExp) => {
    await page.locator('.site-button').click();
    await page.locator('#site-popover').getByRole('button', { name }).first().click();
    await page.waitForTimeout(1000);
    await settle();
  };
  await views.getByRole('link', { name: 'Horizon' }).click();
  await settle();
  await pick(/Malapert/);
  await pick(/IM-2/);
  const first = await held(page);
  await pick(/Malapert/);
  await pick(/IM-2/);
  const again = await held(page);
  expect(asked.length, 'the scans were drawn').toBe(5);
  expect(again.textures, 'no texture more after a round trip').toBe(first.textures);
  expect(again.buffers, 'no buffer more after a round trip').toBe(first.buffers);
  await views.getByRole('link', { name: 'Globe' }).click();
  await expect(host(page)).toHaveCount(0, { timeout: START_MS });
  await page.waitForTimeout(2000);
  expect((await held(page)).buffers, 'every buffer of the view freed').toBe(globeOnly.buffers);
});

