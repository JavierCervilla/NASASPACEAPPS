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
 * Adversarial repro, VENT-7, class A2 (stale state). Promise: the «Listening on Earth» block says which DSN complex
 * listens at the instant, to the minute, and how long it keeps the Moon. Live by default, the instant follows the
 * clock. A page left open across a handoff keeps naming the complex that stopped listening, with the minutes left it
 * had when the page opened, until the next top of the hour (calendar/follow-clock.ts moves a live instant only then).
 * IM-2, 23 November 2026: Robledo hands over to Goldstone at 02:16 UTC.
 */
import { expect, test } from '@playwright/test';
import { stubApi } from '../api-stub';

const OPENED = new Date('2026-11-23T02:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('A2 · a page left open on the live clock names Goldstone after the 02:16 handoff', async ({ page }) => {
    await page.clock.install({ time: OPENED });
    await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
    await stubApi(page);
    await page.goto('./#dsn');
    await expect(page.locator('.globe-viewport[data-status="ready"], .dsn-stage').first()).toBeAttached({ timeout: GLOBE_START_MS });
    const card = page.getByRole('complementary', { name: 'Site card' });
    const block = card.getByRole('region', { name: 'Listening on Earth' });
    const view = page.getByRole('region', { name: 'Deep Space Network' });
    await expect(block.locator('.dsn-block__title')).toHaveText('Robledo', { timeout: GLOBE_START_MS });
    await expect(block).toContainText('16 min left');

    // Twenty minutes later, the page still open and still live: Goldstone has been listening for four.
    await page.clock.runFor('20:00');

    await expect(block.locator('.dsn-block__title')).toHaveText('Goldstone');
    await expect(view.getByRole('heading', { level: 2 })).toHaveText('Goldstone');
    await expect(view.locator('.dsn-band__chip')).toHaveText('02:20');
  });

  test('control · a page opened at 02:20 names Goldstone, as the live page should', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-23T02:20:00Z'));
    await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
    await stubApi(page);
    await page.goto('./#dsn');
    const block = page.getByRole('complementary', { name: 'Site card' }).getByRole('region', { name: 'Listening on Earth' });
    const view = page.getByRole('region', { name: 'Deep Space Network' });
    await expect(block.locator('.dsn-block__title')).toHaveText('Goldstone', { timeout: GLOBE_START_MS });
    await expect(view.getByRole('heading', { level: 2 })).toHaveText('Goldstone');
    await expect(view.locator('.dsn-band__chip')).toHaveText('02:20');
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('A2 · the live DSN widget names Goldstone after the 02:16 handoff', async ({ page }) => {
    await page.clock.install({ time: OPENED });
    await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
    await stubApi(page);
    await page.goto('./');
    const widget = page.locator('.widget--dsn');
    await expect(widget.locator('.widget__value')).toHaveText('Robledo', { timeout: GLOBE_START_MS });
    await expect(widget).toContainText('16 min left');

    await page.clock.runFor('20:00');

    await expect(widget.locator('.widget__value')).toHaveText('Goldstone');
  });
});
