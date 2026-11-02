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
 * VENT-44 polish. The selected marker's ring and the standing pin's halo pulse three times when the selection changes,
 * then rest lit, as the DSN glow does (VENT-7, the human's rule): a loop that never ends keeps the page drawing frames
 * for good. On a 360 px phone at 200 % text the half sheet's summary, taller than the full detent, scrolls, so its last
 * line can be reached.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const CANVAS = new Date('2026-11-22T20:00:00Z');
// A cold run starts a software-rendered globe in every worker: a start-up precondition, not an assertion.
const GLOBE_START_MS = 20_000;
// Three pulses of 2.4 s (globe.css, pin.css), and the DSN glow's three breaths of 3.2 s, with room for a loaded CI.
const SETTLE_MS = 25_000;
const PULSES = /^(globe-ring-pulse(-again)?|pin-halo)$/;

async function open(page: Page, path: string): Promise<void> {
  await page.clock.setFixedTime(CANVAS);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await page.goto(path);
}

/** The names of the page's animations: those still running, or those that would never end. */
async function animations(page: Page, which: 'running' | 'endless'): Promise<string[]> {
  return page.evaluate((kind) => {
    const name = (a: Animation): string => (a as CSSAnimation).animationName ?? a.id;
    return document.getAnimations()
      .filter((a) => (kind === 'running' ? a.playState === 'running' : a.effect?.getComputedTiming().endTime === Infinity))
      .map(name);
  }, which);
}

const pulses = async (page: Page, which: 'running' | 'endless'): Promise<string[]> =>
  (await animations(page, which)).filter((name) => PULSES.test(name));

test.describe('desktop, 1440x900, finite pulses', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the selected marker pulses three times, rests lit, and pulses again for a new site', async ({ page }) => {
    await open(page, './?site=im2-athena');
    await expect(page.locator('.globe-ring')).toBeVisible({ timeout: GLOBE_START_MS });
    await expect.poll(() => pulses(page, 'running')).toEqual([expect.stringMatching(/^globe-ring-pulse/)]);
    expect(await pulses(page, 'endless')).toEqual([]);
    // At rest nothing runs: the page draws no frames.
    await expect.poll(() => animations(page, 'running'), { timeout: SETTLE_MS }).toEqual([]);
    await expect(page.locator('.globe-ring')).toBeVisible();
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('haworth');
    await dialog.getByRole('button', { name: /^Haworth/ }).click();
    await expect.poll(() => pulses(page, 'running'), { timeout: GLOBE_START_MS }).toEqual([expect.stringMatching(/^globe-ring-pulse/)]);
  });

  test('the standing pin\'s halo pulses three times, then rests lit', async ({ page }) => {
    await open(page, './?lat=-85.50&lon=40.00');
    const pin = page.locator('.globe .pin');
    await expect(pin).toBeVisible({ timeout: GLOBE_START_MS });
    await expect.poll(() => pulses(page, 'running')).toContain('pin-halo');
    expect(await pulses(page, 'endless')).toEqual([]);
    await expect.poll(() => animations(page, 'running'), { timeout: SETTLE_MS }).toEqual([]);
    await expect(pin).toBeVisible();
  });
});

test.describe('phone, 360x740, 200 % text, Haworth', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('the half sheet\'s summary scrolls until its last line clears the tab bar', async ({ page }) => {
    await open(page, './?site=artemis-haworth');
    const summary = page.locator('.sheet [data-sheet-fit]');
    await expect(summary.locator('.widget').first()).toBeVisible({ timeout: GLOBE_START_MS });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await page.waitForTimeout(900);
    await expect(page.locator('.sheet')).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    const box = (await summary.boundingBox())!;
    const sheetTop = (await page.locator('.sheet').boundingBox())!.y;
    // Four swipes of a finger up the summary, as on a phone.
    const cdp = await page.context().newCDPSession(page);
    const x = Math.round(box.x + box.width / 2);
    const [from, to] = [Math.round(box.y + box.height - 40), Math.round(box.y + 60)];
    for (let swipe = 0; swipe < 4; swipe += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
      for (let y = from - 10; y >= to; y -= 10) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    const tabsTop = (await page.getByRole('navigation', { name: 'Views' }).boundingBox())!.y;
    await expect.poll(() => summary.evaluate((el) =>
      Math.max(...[...el.children].map((c) => c.getBoundingClientRect()).filter((b) => b.height > 0).map((b) => b.bottom)),
    )).toBeLessThanOrEqual(tabsTop);
    // The finger scrolled the summary; it did not drag the sheet.
    expect((await page.locator('.sheet').boundingBox())!.y).toBe(sheetTop);
  });
});

/**
 * At 100 % text in Spanish, Haworth's summary (shadow note, horizon strip, computed caption) is taller than the full
 * detent, so it scrolls. As an iOS sheet does, a finger pulling down on it while it shows its top drags the sheet down
 * to a lower detent; a finger pushing up scrolls it until its last line sits 12 px above the tab bar.
 */
test.describe('phone, 360x740, es, 100 % text, Haworth: a scrolling summary', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  async function scrollingSummary(page: Page) {
    await open(page, './es/?site=artemis-haworth');
    const summary = page.locator('.sheet [data-sheet-fit]');
    await expect(summary.locator('.widget').first()).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.sheet')).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    // The precondition QA found: the summary outgrows the full detent and scrolls.
    await expect(summary).toHaveAttribute('data-sheet-scroll');
    return summary;
  }

  /**
   * One finger from `from` to `to` (y) at `x`, in 10 px steps, through CDP as on a phone; `holdMs` keeps it still
   * before it lifts, so the release carries no velocity and the sheet snaps by position alone.
   */
  async function swipe(page: Page, x: number, from: number, to: number, holdMs = 0): Promise<void> {
    const cdp = await page.context().newCDPSession(page);
    const step = to > from ? 10 : -10;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
    for (let y = from + step; step > 0 ? y <= to : y >= to; y += step) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    if (holdMs > 0) await page.waitForTimeout(holdMs);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  const sheetTop = async (page: Page): Promise<number> => (await page.locator('.sheet').boundingBox())!.y;

  test('a swipe down on the summary at its top drags the sheet down to a lower detent', async ({ page }) => {
    const summary = await scrollingSummary(page);
    const top = await sheetTop(page);
    const box = (await summary.boundingBox())!;
    const x = Math.round(box.x + box.width / 2);
    const from = Math.round(box.y + 80);
    // Held still at the end: 1:1 under the finger, then the nearest detent below.
    await swipe(page, x, from, from + 300, 400);
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'peek');
    await expect(page.locator('.sheet')).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    expect(await sheetTop(page)).toBeGreaterThan(top + 200);
    // Lowered, the summary drags the sheet both ways: a swipe up on its head brings it back to its top.
    const head = (await summary.locator('.summary__head').boundingBox())!;
    const y = Math.round(head.y + head.height / 2);
    await swipe(page, x, y, y - 300);
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', /^(half|full)$/);
    await expect(page.locator('.sheet')).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    expect(await sheetTop(page)).toBe(top);
  });

  test('a swipe up scrolls the summary until its last line sits 12 px above the tab bar', async ({ page }) => {
    const summary = await scrollingSummary(page);
    const top = await sheetTop(page);
    const box = (await summary.boundingBox())!;
    const x = Math.round(box.x + box.width / 2);
    for (let n = 0; n < 3; n += 1) await swipe(page, x, Math.round(box.y + box.height - 40), Math.round(box.y + 60));
    const tabsTop = (await page.getByRole('navigation', { name: 'Vistas' }).boundingBox())!.y;
    const lastLine = (): Promise<number> => summary.evaluate((el) =>
      Math.max(...[...el.children].map((c) => c.getBoundingClientRect()).filter((b) => b.height > 0).map((b) => b.bottom)));
    await expect.poll(lastLine).toBeLessThanOrEqual(tabsTop - 12 + 1);
    expect(await lastLine()).toBeGreaterThanOrEqual(tabsTop - 12 - 2);
    expect(await sheetTop(page)).toBe(top);
  });
});
