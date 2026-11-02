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
 * Adversarial repro, MVP close, class A5 (limits: 200 % text). Promise: the phone's tab bar holds its tabs with each
 * label whole (dsn.spec.ts: «the five tabs fit the bar, each label whole»; VENT-7 made them five). With the text at
 * 200 % (the root font size, as dsn.spec.ts emulates it), «Globe», «Calendar», «Horizon» and «Sites» break inside
 * the word («Glob/e», «Calend/ar»). Not new in VENT-7: the four tabs before it break the same way.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from '../api-stub';

const NOW = new Date('2026-11-22T20:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;

/** The one-word tab labels laid out on more than one line. */
async function brokenLabels(page: Page): Promise<string[]> {
  return page.locator('.tab > span:not(.tab__soon)').evaluateAll((els) =>
    els.filter((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
      return lines.size > 1;
    }).map((el) => el.textContent ?? ''));
}

async function openAt(page: Page, fontSize: string): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  await page.goto('./');
  await expect(page.locator('.tab')).toHaveCount(5, { timeout: GLOBE_START_MS });
  await page.evaluate((size) => {
    document.documentElement.style.fontSize = size;
  }, fontSize);
}

for (const width of [360, 390]) {
  test.describe(`phone, ${width}x844`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });

    test('A5 · at 200 % text no tab label breaks inside its word', async ({ page }) => {
      await openAt(page, '200%');
      await expect.poll(() => brokenLabels(page)).toEqual([]);
    });

    test('control · at 100 % text no tab label breaks inside its word', async ({ page }) => {
      await openAt(page, '100%');
      await expect.poll(() => brokenLabels(page)).toEqual([]);
    });
  });
}
