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
 * Walking in the on-foot view (VENT-121, the human's variant 3A on the canvas): a tap on the ground glides the eye
 * there and the view draws only while it moves; chip 3A says how far and which way from the site the eye stands and
 * the state there; «Back» glides back; ↑ steps 10 m; under reduced motion the eye moves at once; a tap beyond the
 * 1.5 km reach stops at its edge and offers «Drop a pin here», which makes the eye's place the custom point.
 *
 * IM-2 on its recorded LOLA relief (terrain-stub.ts) for the moves; the reach's edge on the synthetic relief, whose
 * mountain 15 km away is ground a tap can aim at well past the reach (no such known target in the recorded tiles).
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubRealRelief, stubTile, stubWall } from './terrain-stub';
import { idleCount } from './view-idle';
import { START_PITCH } from '../../packages/web/src/terrain/view-camera';
import { VIEW_FOV } from '../../packages/web/src/terrain/view-fov';

const AT = new Date('2026-11-22T20:00:00Z');
/** A folder for screenshots of the chip, the edge card and the phone (VENT121_SHOTS only). */
const SHOTS = process.env.VENT121_SHOTS;
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

// By class, so the pseudo-locale's accented names find them too.
const view = (page: Page) => page.locator('.on-foot');
const host = (page: Page) => view(page).locator('.on-foot__host');
const frames = async (page: Page): Promise<number> => Number(await host(page).getAttribute('data-frames'));
const chip = (page: Page) => view(page).locator('.walk-chip');

/** The eye, metres east and north of the point, from `data-eye`. */
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

async function clickAt(page: Page, upDeg: number): Promise<void> {
  const { x, y } = await spotAt(page, upDeg);
  await page.mouse.click(x, y);
}

async function hoverAt(page: Page, upDeg: number): Promise<void> {
  const { x, y } = await spotAt(page, upDeg);
  await page.mouse.move(x, y);
}

/** The view's heading, from its text alternative. */
async function heading(page: Page): Promise<number> {
  const id = (await host(page).getAttribute('aria-describedby')) ?? '';
  const text = (await page.locator(`[id="${id}"]`).textContent()) ?? '';
  return Number(/View heading (\d+)°/.exec(text)?.[1]);
}

/** Turns the focused view by 5° keys until it faces within 3° of `azDeg`. */
async function turnTo(page: Page, azDeg: number): Promise<void> {
  for (let i = 0; i < 80; i++) {
    const off = ((azDeg - (await heading(page)) + 540) % 360) - 180;
    if (Math.abs(off) <= 3) return;
    const big = Math.abs(off) > 10 ? 'Shift+' : '';
    await page.keyboard.press(`${big}${off > 0 ? 'ArrowRight' : 'ArrowLeft'}`);
  }
}

/** Waits until the eye stops moving (its `data-eye` the same twice, 400 ms apart). */
async function arrived(page: Page): Promise<[number, number]> {
  let last = '';
  await expect.poll(async () => {
    const now = (await host(page).getAttribute('data-eye')) ?? '';
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [400], timeout: 15_000 }).toBe(true);
  return eye(page);
}

test.describe('desktop, 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('a click on the ground glides the eye there, the chip says where and the state, and the view rests after', async ({ page }) => {
    await open(page, './?site=im2-athena&onfoot=far#horizon', true);
    const rest = await settled(page);
    expect(await eye(page)).toEqual([0, 0]);
    await expect(chip(page)).toHaveCount(0);
    await expect(view(page).locator('.walk-hint')).toContainText('Click the ground to go there');
    // 3.3° under the level: about 35 m of ground ahead. A mouse over it first: the ring and its distance follow it.
    await hoverAt(page, -(3.3 + START_PITCH));
    await expect(view(page).locator('.on-foot__label--walk')).toBeVisible();
    await expect(view(page).locator('.on-foot__label--walk')).toHaveText(/^\d+ m$/);
    await clickAt(page, -(3.3 + START_PITCH));
    await expect.poll(() => away(page), { timeout: 15_000 }).toBeGreaterThan(5);
    await arrived(page);
    const glideFrames = (await frames(page)) - rest;
    console.log(`VENT-121 frames drawn from the click to the arrival: ${glideFrames}`);
    expect(glideFrames).toBeGreaterThan(1);
    await expect(chip(page)).toBeVisible();
    await expect(chip(page)).toContainText(/\d+ m (N|NE|E|SE|S|SW|W|NW) of IM-2/);
    await expect(chip(page)).toContainText(/(Window|Sun|Earth|Neither) here/);
    await shot(page, 'walk-desktop-chip');
    await expect(view(page).locator('.walk-hint')).toHaveCount(0);
    await expect(view(page).locator('[aria-live="polite"]').filter({ hasText: / of IM-2 · / })).toHaveCount(1);
    const describedBy = await host(page).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${describedBy ?? ''}"]`)).toContainText(/You stand \d+ m (N|NE|E|SE|S|SW|W|NW) of IM-2\./);
    const still = await idleCount(host(page));
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(still);
    expect(await page.evaluate(() => localStorage.getItem('ventana.walkHint'))).toBe('seen');
    await chip(page).getByRole('button', { name: 'Back to IM-2' }).click();
    await expect.poll(() => eye(page), { timeout: 15_000 }).toEqual([0, 0]);
    await expect(chip(page)).toHaveCount(0);
  });

  test('↑ steps 10 m along the heading and ↓ steps back; Page Up tilts the view instead of ↑', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './?site=im2-athena&onfoot=far#horizon', true);
    await settled(page);
    await host(page).focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => away(page)).toBeCloseTo(10, 0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => away(page)).toBeCloseTo(0, 0);
    const before = await frames(page);
    await page.keyboard.press('PageUp');
    await expect.poll(() => frames(page)).toBeGreaterThan(before);
    expect(await eye(page)).toEqual([0, 0]);
  });

  test('under reduced motion a click moves the eye at once, in one frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './?site=im2-athena&onfoot=far#horizon', true);
    await settled(page);
    await clickAt(page, -(3.3 + START_PITCH));
    // The eye is written before the next frame draws: no frame in between shows it on its way.
    await expect.poll(() => away(page), { timeout: 5000 }).toBeGreaterThan(5);
    const first = await eye(page);
    await page.waitForTimeout(300);
    expect(await eye(page)).toEqual(first);
    await expect(chip(page)).toBeVisible();
  });

  test('a click past the reach stops at its edge, and «Drop a pin here» opens the view at the eye’s place', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './?lat=-85.50&lon=40.00#horizon', false);
    await settled(page);
    await host(page).focus();
    // Toward the synthetic mountain 15 km away (its plane offset 15 km, -3 km is azimuth 61° at 40° E, clear of the
    // 40 m ridge at 95°), and on its flank, 3° up.
    await turnTo(page, 61);
    await idleCount(host(page));
    await clickAt(page, 3 - START_PITCH);
    await expect.poll(() => away(page), { timeout: 15_000 }).toBeGreaterThan(1400);
    expect(await away(page)).toBeCloseTo(1500, -1);
    const edge = view(page).getByRole('region', { name: 'End of the detailed ground' });
    await expect(edge).toBeVisible();
    await expect(edge).toContainText('You are 1.5 km from Custom point.');
    await shot(page, 'walk-desktop-edge');
    await edge.getByRole('button', { name: 'Drop a pin here' }).click();
    // 1.5 km at 61°: 0.73 km north (0.024° of latitude) and 1.31 km east (0.55° of longitude at 85.5° S).
    await expect(page).toHaveURL(/lat=-85\.4[78]&lon=40\.5[45]/);
    await expect.poll(() => eye(page), { timeout: START_MS }).toEqual([0, 0]);
    await expect(chip(page)).toHaveCount(0);
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a tap walks; the chip sits under the top bar, left of the compass, and the hint says «Tap»', async ({ page }) => {
    await open(page, './?site=im2-athena&quality=low&onfoot=far', true);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
    await settled(page);
    await expect(view(page).locator('.walk-hint')).toContainText('Tap the ground to go there');
    const box = (await host(page).boundingBox())!;
    const bar = (await page.locator('.phone-bar').boundingBox())!;
    const sheetTop = await page.evaluate(() => document.querySelector('.sheet')?.getBoundingClientRect().top ?? innerHeight);
    // The middle of the free band, a little under the level: ground.
    const y = (bar.y + bar.height + sheetTop) / 2 + 60;
    await page.touchscreen.tap(box.x + box.width / 2, y);
    await expect.poll(() => away(page), { timeout: 15_000 }).toBeGreaterThan(5);
    await arrived(page);
    await expect(chip(page)).toBeVisible();
    const chipBox = (await chip(page).boundingBox())!;
    const compass = (await view(page).getByRole('button', { name: /^View heading / }).boundingBox())!;
    expect(chipBox.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(compass.x);
    expect(chipBox.x).toBeGreaterThanOrEqual(0);
    await shot(page, 'walk-phone-chip');
  });
});

test.describe('phone, 360x740, pseudo-locale', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('at 200 % text the chip and its «Back» stay inside the screen, clear of the compass', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './en-xa/?site=im2-athena&quality=low&onfoot=far', true);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    // The tab bar's fourth tab, «Horizon» (its name is accented here): the sheet goes to peek.
    await page.locator('.tab-bar').getByRole('button').nth(3).click();
    await settled(page);
    await host(page).focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => away(page)).toBeCloseTo(10, 0);
    await expect(chip(page)).toBeVisible();
    const chipBox = (await chip(page).boundingBox())!;
    const back = (await chip(page).getByRole('button').boundingBox())!;
    const compass = (await view(page).locator('.compass').boundingBox())!;
    const sheetTop = await page.evaluate(() => document.querySelector('.sheet')?.getBoundingClientRect().top ?? 0);
    expect(chipBox.y + chipBox.height).toBeLessThanOrEqual(sheetTop);
    expect(chipBox.x).toBeGreaterThanOrEqual(0);
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(compass.x);
    expect(back.x + back.width).toBeLessThanOrEqual(chipBox.x + chipBox.width);
    expect(back.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shot(page, 'walk-phone-pseudo-200');
  });
});
