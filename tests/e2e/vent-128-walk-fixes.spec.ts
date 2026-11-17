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
 * The walk's fixes after VENT-121's review (VENT-128): the hover ring picks at most once a display frame and draws
 * nothing when it would not change; a press that only stops a coast does not walk; the chip never claims the Sun at a
 * site in permanent shadow; on a phone at 200 % text the chip and the caption never overlap; the edge card goes as
 * soon as the eye starts back. IM-2 on its recorded LOLA relief; the reach's edge and Shackleton on the synthetic
 * relief.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubRealRelief, stubTile, stubWall } from './terrain-stub';
import { idleCount } from './view-idle';
import { START_PITCH } from '../../packages/web/src/terrain/view-camera';
import { VIEW_FOV } from '../../packages/web/src/terrain/view-fov';

const AT = new Date('2026-11-22T20:00:00Z');
/** A folder for screenshots (VENT128_SHOTS only). */
const SHOTS = process.env.VENT128_SHOTS;
const shot = async (page: Page, name: string): Promise<void> => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const START_MS = 30_000;

async function open(page: Page, path: string, real: boolean): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  if (real) await stubRealRelief(page);
  else {
    await stubWall(page, 300, 330);
    await stubTile(page);
  }
  await page.goto(path);
}

const view = (page: Page) => page.locator('.on-foot');
const host = (page: Page) => view(page).locator('.on-foot__host');
const frames = async (page: Page): Promise<number> => Number(await host(page).getAttribute('data-frames'));
const picks = async (page: Page): Promise<number> => Number((await host(page).getAttribute('data-picks')) ?? 0);
const chip = (page: Page) => view(page).locator('.walk-chip');

async function eye(page: Page): Promise<[number, number]> {
  const [e, n] = ((await host(page).getAttribute('data-eye')) ?? '0,0').split(',').map(Number);
  return [e ?? 0, n ?? 0];
}
const away = async (page: Page): Promise<number> => Math.hypot(...(await eye(page)));

async function settled(page: Page): Promise<number> {
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(() => frames(page), { timeout: START_MS }).toBeGreaterThan(0);
  return idleCount(host(page));
}

/** The point of the view `upDeg` over the screen's centre line (the look's pitch), on its centre column. */
async function spotAt(page: Page, upDeg: number): Promise<{ x: number; y: number }> {
  const box = (await host(page).boundingBox())!;
  const tanHalf = Math.tan((VIEW_FOV.wide * Math.PI) / 360);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 - (Math.tan((upDeg * Math.PI) / 180) / tanHalf) * (box.height / 2) };
}

/** The view's heading, from its text alternative. */
async function heading(page: Page): Promise<number> {
  const id = (await host(page).getAttribute('aria-describedby')) ?? '';
  const text = (await page.locator(`[id="${id}"]`).textContent()) ?? '';
  return Number(/View heading (\d+)°/.exec(text)?.[1]);
}

async function turnTo(page: Page, azDeg: number): Promise<void> {
  for (let i = 0; i < 80; i++) {
    const off = ((azDeg - (await heading(page)) + 540) % 360) - 180;
    if (Math.abs(off) <= 3) return;
    const big = Math.abs(off) > 10 ? 'Shift+' : '';
    await page.keyboard.press(`${big}${off > 0 ? 'ArrowRight' : 'ArrowLeft'}`);
  }
}

/**
 * `count` mouse moves from `from`, `stepPx` apart along x, in one task (as a fast mouse sends them between two
 * frames); the milliseconds the page spent in their handlers.
 */
async function burst(page: Page, from: { x: number; y: number }, count: number, stepPx: number): Promise<number> {
  return page.evaluate(({ from, count, stepPx }) => {
    const el = document.querySelector('.on-foot__host')!;
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', pointerId: 1,
        clientX: from.x + i * stepPx, clientY: from.y }));
    }
    return performance.now() - t0;
  }, { from, count, stepPx });
}

/** Whether two boxes overlap. */
const overlap = (a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The caption is hidden, or wholly inside the box that clips it, apart from `chip`. */
async function captionClear(page: Page, chipBox: Locator): Promise<void> {
  const caption = view(page).locator('.on-foot__caption');
  if (!(await caption.isVisible())) return;
  const box = (await caption.boundingBox())!;
  const clip = (await view(page).locator('.on-foot__top').boundingBox())!;
  const other = (await chipBox.boundingBox())!;
  expect(overlap(box, other), 'the chip covers the caption').toBe(false);
  expect(box.y, 'the caption is cut at its top').toBeGreaterThanOrEqual(clip.y - 0.5);
  expect(box.y + box.height, 'the caption is cut at its bottom').toBeLessThanOrEqual(clip.y + clip.height + 0.5);
}

test.describe('desktop, 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the hover ring picks once a frame, and moves over the sky draw nothing', async ({ page }) => {
    await open(page, './?site=im2-athena&onfoot=far#horizon', true);
    await settled(page);
    const ground = await spotAt(page, -(3.3 + START_PITCH));
    const sky = await spotAt(page, 12 - START_PITCH);
    // Sixty moves in one task over the ground: one pick, the latest, and one frame for the ring.
    let rest = await idleCount(host(page));
    const groundMs = await burst(page, { x: ground.x - 60, y: ground.y }, 60, 2);
    await expect(view(page).locator('.on-foot__label--walk')).toBeVisible();
    const afterGround = await idleCount(host(page));
    console.log(`VENT-128 60 ground moves: handlers ${groundMs.toFixed(1)} ms, picks ${await picks(page)}, frames ${afterGround - rest}`);
    expect(await picks(page)).toBe(1);
    expect(afterGround - rest).toBeLessThanOrEqual(2);
    // The ring hidden, sixty moves over the sky: the ring stays hidden, nothing to draw.
    await burst(page, sky, 1, 0);
    rest = await idleCount(host(page));
    const skyMs = await burst(page, { x: sky.x - 60, y: sky.y }, 60, 2);
    await page.waitForTimeout(500);
    console.log(`VENT-128 60 sky moves: handlers ${skyMs.toFixed(1)} ms, frames ${(await frames(page)) - rest}`);
    expect(await frames(page)).toBe(rest);
    // A real mouse sweeping the ground for about a second: picks never outnumber the frames drawn.
    rest = await frames(page);
    const before = await picks(page);
    const t0 = Date.now();
    await page.mouse.move(ground.x - 200, ground.y);
    await page.mouse.move(ground.x + 200, ground.y + 40, { steps: 30 });
    const seconds = (Date.now() - t0) / 1000;
    await idleCount(host(page));
    const swept = { frames: (await frames(page)) - rest, picks: (await picks(page)) - before };
    console.log(`VENT-128 sweep of 31 moves in ${seconds.toFixed(2)} s: ${swept.frames} frames, ${swept.picks} picks`);
    expect(swept.picks).toBeLessThanOrEqual(swept.frames + 1);
  });

  test('a press that only stops a coast does not walk', async ({ page }) => {
    await open(page, './?site=im2-athena&quality=low&onfoot=far#horizon', true);
    await settled(page);
    const ground = await spotAt(page, -(3.3 + START_PITCH));
    const start = await heading(page);
    // A fast swipe, 10 moves of 3 px 10 ms apart, their times set as terrain-view.spec.ts does (in software GL a real
    // mouse's moves arrive a frame apart and no swipe is fast): the look coasts on after the release.
    await host(page).evaluate((el, { x, y }) => {
      const t0 = performance.now();
      const send = (type: string, i: number): void => {
        const event = new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
          buttons: 1, clientX: x - 15 + i * 3, clientY: y, bubbles: true, cancelable: true });
        Object.defineProperty(event, 'timeStamp', { value: t0 + i * 10 });
        el.dispatchEvent(event);
      };
      send('pointerdown', 0);
      for (let i = 1; i <= 10; i++) send('pointermove', i);
      send('pointerup', 10);
    }, ground);
    const turned = await frames(page);
    await expect.poll(() => frames(page), { timeout: 5000 }).toBeGreaterThan(turned + 1);
    // A click on the ground while it coasts: it stops the view, as on the globe, and walks nowhere.
    await page.mouse.click(ground.x, ground.y);
    await idleCount(host(page));
    expect(await heading(page)).not.toBe(start);
    await page.waitForTimeout(800);
    expect(await eye(page)).toEqual([0, 0]);
    await expect(chip(page)).toHaveCount(0);
    // The next click, on a still view, walks.
    await page.mouse.click(ground.x, ground.y);
    await expect.poll(() => away(page), { timeout: 15_000 }).toBeGreaterThan(5);
  });

  // Out to the edge under reduced motion (the eye goes at once), back with motion: the glide back is what is watched.
  test('the edge card goes as soon as the eye starts back', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './?lat=-85.50&lon=40.00#horizon', false);
    await settled(page);
    await host(page).focus();
    await turnTo(page, 61);
    await idleCount(host(page));
    const { x, y } = await spotAt(page, 3 - START_PITCH);
    await page.mouse.click(x, y);
    const edge = view(page).getByRole('region', { name: 'End of the detailed ground' });
    await expect(edge).toBeVisible({ timeout: 15_000 });
    expect(await away(page)).toBeGreaterThan(1400);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await edge.getByRole('button', { name: /^Back to / }).click();
    await expect(edge).toHaveCount(0, { timeout: 5000 });
    // The card went while the eye was still on its way back, which it is.
    expect(await away(page)).toBeGreaterThan(300);
    await expect.poll(() => away(page), { timeout: 15_000 }).toBeLessThan(1400);
  });
});

test.describe('desktop, 1280x800 at 2x', () => {
  test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

  test('at a site in permanent shadow the chip never says the Sun is there', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './?site=change7-target&onfoot=far#horizon', false);
    await settled(page);
    const ground = await spotAt(page, -(3.3 + START_PITCH));
    await page.mouse.click(ground.x, ground.y);
    await expect.poll(() => away(page), { timeout: 15_000 }).toBeGreaterThan(5);
    await expect(chip(page)).toBeVisible();
    await shot(page, 'walk-chip-psr');
    console.log(`VENT-128 chip at Shackleton: ${await chip(page).textContent()}`);
    await expect(chip(page)).toContainText(/(Earth|Neither) here/);
    await expect(view(page).locator('[aria-live="polite"]')).not.toContainText(/(Sun|Window) here/);
  });
});

/** Opens IM-2's view on a phone at 200 % text, taps the ground, and checks the chip against the caption. */
async function phoneAt200(page: Page, path: string, name: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, path, true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  // The tab bar's fourth tab, «Horizon»: the sheet goes to peek.
  await page.locator('.tab-bar').getByRole('button').nth(3).click();
  await settled(page);
  const box = (await host(page).boundingBox())!;
  const bar = (await page.locator('.phone-bar').boundingBox())!;
  const edge = await page.evaluate(() => document.querySelector('.sheet')?.getBoundingClientRect().top ?? innerHeight);
  await page.touchscreen.tap(box.x + box.width / 2, (bar.y + bar.height + edge) / 2 + 60);
  await expect.poll(() => away(page), { timeout: 15_000 }).toBeGreaterThan(5);
  await expect(chip(page)).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, name);
  await captionClear(page, chip(page));
  const where = chip(page).locator('.walk-chip__where');
  const whereBox = (await where.boundingBox())!;
  const chipBox = (await chip(page).boundingBox())!;
  expect(whereBox.y + whereBox.height).toBeLessThanOrEqual(chipBox.y + chipBox.height + 0.5);
}

test.describe('phone, 390x844, 200 % text', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the chip and the caption never overlap', async ({ page }) => {
    await phoneAt200(page, './?site=im2-athena&quality=low&onfoot=far', 'walk-phone-390-200');
  });
});

test.describe('phone, 360x740, pseudo-locale, 200 % text', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('the chip and the caption never overlap', async ({ page }) => {
    await phoneAt200(page, './en-xa/?site=im2-athena&quality=low&onfoot=far', 'walk-phone-360-pseudo-200');
  });
});
