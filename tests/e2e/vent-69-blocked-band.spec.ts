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
 * The «browser blocked 3D» message on a phone (VENT-69 QA): it keeps to the free band between the top bar and the
 * sheet (or the tab bar), at 390 x 844 and at 200 % text, on the globe and in the Horizon view, over a backing.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';

const AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;

async function openBlocked(page: Page, hash: string): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    localStorage.setItem('ventana.glWorked', String(Date.now()));
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/.test(type)) return null;
      return (getContext as (...args: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as typeof getContext;
  });
  await stubApi(page);
  await stubRealRelief(page);
  await page.goto(`./?site=im2-athena&quality=low${hash}`);
}

/** Where the words' box sits against the chrome: its top under the bar, its bottom over the sheet and the tab bar. */
async function placement(page: Page, message: Locator): Promise<{ underBar: boolean; overFloor: boolean }> {
  const box = await message.boundingBox();
  const chrome = await page.evaluate(() => {
    const bottom = (s: string): number => document.querySelector(s)?.getBoundingClientRect().bottom ?? 0;
    const top = (s: string): number => document.querySelector(s)?.getBoundingClientRect().top ?? Infinity;
    return { barBottom: bottom('.phone-bar'), floor: Math.min(top('.sheet'), top('.tab-bar')) };
  });
  if (!box) return { underBar: false, overFloor: false };
  return { underBar: box.y >= chrome.barBottom - 0.5, overFloor: box.y + box.height <= chrome.floor + 0.5 };
}

/**
 * The words' box must sit inside the free band and touch no chrome. Polled, not read once after a fixed wait: at 200 %
 * text the sheet first has to close to make room (roomAsk), and on a loaded runner that move outlasted 500 ms.
 */
async function expectInFreeBand(page: Page, message: Locator): Promise<void> {
  await expect(message).toBeVisible({ timeout: START_MS });
  await expect.poll(() => placement(page, message)).toEqual({ underBar: true, overFloor: true });
  const backing = await message.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(backing).not.toBe('rgba(0, 0, 0, 0)');
}

for (const scale of [1, 2]) {
  test.describe(`phone 390 x 844, text x${scale}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((s) => {
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.fontSize = `${s * 100}%`;
        });
      }, scale);
    });

    test('the globe\'s message', async ({ page }) => {
      await openBlocked(page, '');
      await expectInFreeBand(page, page.locator('.globe-help[data-status="blocked"]'));
    });

    test('the Horizon view\'s message', async ({ page }) => {
      await openBlocked(page, '#horizon');
      await expectInFreeBand(page, page.locator('.on-foot__status'));
    });
  });
}
