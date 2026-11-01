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
 * Adversarial repro, VENT-7, class A5 (limits: 200 % text). Promise: the DSN view on a phone shows the Earth as the
 * Moon sees it with labelled antennas and «Moon overhead», and the view keeps working at 200 % text. With the text
 * at 200 % (the root font size, as dsn.spec.ts emulates it), the labels over the phone's big Earth are placed by the
 * marks' centres and run past the screen's edge: «Moon overhead» is cut on the right, «Goldstone» on the left.
 * IM-2, 22 November 2026, 20:00 UTC (the canvas's instant).
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from '../api-stub';

const CANVAS = new Date('2026-11-22T20:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;

/** The labels over the DSN stage's Earth that reach past the screen's left or right edge. */
async function cutLabels(page: Page): Promise<string[]> {
  return page.locator('.dsn-stage .dsn-earth__label').evaluateAll((els) =>
    els.filter((el) => {
      const box = el.getBoundingClientRect();
      return box.left < -0.5 || box.right > innerWidth + 0.5;
    }).map((el) => el.textContent ?? ''));
}

async function openDsn(page: Page, fontSize: string): Promise<void> {
  await page.clock.setFixedTime(CANVAS);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  await page.goto('./#dsn');
  await expect(page.locator('.dsn-stage .dsn-earth__label').first()).toBeVisible({ timeout: GLOBE_START_MS });
  await page.evaluate((size) => {
    document.documentElement.style.fontSize = size;
  }, fontSize);
  await expect(page.locator('.dsn-stage .dsn-earth__label')).toContainText(['Goldstone', 'Robledo', 'Moon overhead']);
}

for (const width of [360, 390]) {
  test.describe(`phone, ${width}x844`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });

    test('A5 · at 200 % text every label over the DSN Earth stays on the screen', async ({ page }) => {
      await openDsn(page, '200%');
      await expect.poll(() => cutLabels(page)).toEqual([]);
    });

    test('control · at 100 % text every label over the DSN Earth stays on the screen', async ({ page }) => {
      await openDsn(page, '100%');
      await expect.poll(() => cutLabels(page)).toEqual([]);
    });
  });
}
