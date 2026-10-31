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
 * QA evidence for VENT-35, not a check: in each language, the phone at 390x844 (the sheet at half, the Sites sheet with
 * its Language row, and the language list pushed into it) and the desktop header at 1440x900 with the language menu
 * open. It runs only on request, into production/qa/evidence/ or EVIDENCE_DIR:
 *
 *   CAPTURE_EVIDENCE=1 npm run e2e -- i18n-evidence.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const OUT = process.env.EVIDENCE_DIR
  ? new URL(`file://${process.env.EVIDENCE_DIR.replace(/\/?$/, '/')}`)
  : new URL('../../production/qa/evidence/', import.meta.url);
const DATE = new Date().toISOString().slice(0, 10);
const NOW = new Date('2026-11-29T20:00:00Z');
const LOCALES = [['', 'en'], ['es/', 'es'], ['fr/', 'fr'], ['de/', 'de'], ['it/', 'it']] as const;

const shot = (page: Page, name: string) =>
  page.screenshot({ path: new URL(`${DATE}-vent-35-${name}.png`, OUT).pathname });

async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto(`./${path}`);
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
  await page.waitForTimeout(600);
}

test.describe('i18n evidence', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');

  for (const [path, locale] of LOCALES) {
    test.describe(`phone, ${locale}`, () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

      test(`phone ${locale}: half sheet, Sites sheet, language list`, async ({ page }) => {
        await open(page, path);
        await expect(page.locator('.widget')).toHaveCount(4);
        await shot(page, `${locale}-phone-390-half`);
        await page.locator('.tab-bar .tab').last().click();
        await expect(page.locator('.lang-row')).toBeVisible();
        await page.waitForTimeout(400);
        await shot(page, `${locale}-phone-390-sites`);
        await page.locator('.lang-row').click();
        await expect(page.locator('.lang-list')).toBeVisible();
        await page.waitForTimeout(800);
        await shot(page, `${locale}-phone-390-languages`);
      });
    });

    test.describe(`desktop, ${locale}`, () => {
      test.use({ viewport: { width: 1440, height: 900 } });

      test(`desktop ${locale}: header with the language menu open`, async ({ page }) => {
        await open(page, path);
        await page.locator('.lang-button').click();
        await expect(page.locator('.lang-list')).toBeVisible();
        await page.waitForTimeout(500);
        await shot(page, `${locale}-desktop-1440-menu`);
      });
    });
  }
});
