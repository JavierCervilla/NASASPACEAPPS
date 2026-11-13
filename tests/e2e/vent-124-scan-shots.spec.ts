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
 * The scanned rocks' captures and costs (VENT-124): IM-2's recorded relief at 2026-11-20 12:00 UTC (the Sun up), on a
 * phone at the medium tier (412x915, the sheet at peek) and a desktop (1440x900) at the high and the medium tier, each
 * with the stones (`?rocks=stones`) and the scans (the default), at the opening heading and then pitched down. Runs
 * only with `VENT124_SHOTS=<dir>`, where it saves the screenshots and a JSON line per capture: the host's calls and
 * triangles per frame and the rock files' bytes.
 */
import { expect, test, type Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';

const SHOTS = process.env.VENT124_SHOTS;
const AT = new Date('2026-11-20T12:00:00Z');
const START_MS = 120_000;
const LOOKS = ['stones', 'scan'] as const;
const TIERS = ['high', 'medium'] as const;
/** Key presses down: 3° each, 48° in all. */
const PITCH_DOWN = 16;

const host = (page: Page) => page.locator('.on-foot__host');

async function rest(page: Page): Promise<void> {
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await page.waitForTimeout(1500);
}

/** The rock files each page fetched, by name, and their bytes. */
const fetched = new WeakMap<Page, Map<string, number>>();
function countRocks(page: Page): void {
  const seen = new Map<string, number>();
  fetched.set(page, seen);
  page.on('response', async (r) => {
    if (/on-foot-rock/.test(r.url())) seen.set(r.url().split('/').pop() ?? '', (await r.body()).length);
  });
}
const rockBytes = (page: Page) => Object.fromEntries(fetched.get(page) ?? []);

async function capture(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  const draws = await host(page).getAttribute('data-draws');
  appendFileSync(`${SHOTS}/measures.jsonl`, `${JSON.stringify({ name, draws, rocks: rockBytes(page) })}\n`);
}

async function open(page: Page, query: string, phone: boolean): Promise<void> {
  fetched.get(page)?.clear();
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
    localStorage.setItem('ventana.walkHint', 'seen');
  });
  await stubApi(page);
  await stubRealRelief(page);
  if (phone) {
    await page.goto(`./?site=im2-athena${query}`);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
  } else {
    await page.goto(`./?site=im2-athena${query}#horizon`);
  }
  await rest(page);
}

async function shoot(page: Page, device: string, tier: string, phone: boolean): Promise<void> {
  countRocks(page);
  for (const look of LOOKS) {
    const rocks = look === 'stones' ? '&rocks=stones' : '';
    await open(page, `&quality=${tier}${rocks}`, phone);
    const name = `${device}-${tier}-${look}`;
    await capture(page, `${name}-level`);
    await host(page).focus();
    for (let k = 0; k < PITCH_DOWN; k++) await page.keyboard.press('ArrowDown');
    await rest(page);
    await capture(page, `${name}-down`);
  }
}

test.describe('VENT-124 scanned rocks captures', () => {
  test.skip(!SHOTS, 'only with VENT124_SHOTS');
  test.setTimeout(900_000);
  test.beforeAll(() => mkdirSync(SHOTS ?? '.', { recursive: true }));

  // A phone never runs the high tier (`phoneTier`, globe/quality-pick.ts): `?quality=high` opens it at medium.
  test.describe('phone medium', () => {
    test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    test('phone at medium', async ({ page }) => shoot(page, 'phone', 'medium', true));
  });
  for (const tier of TIERS) {
    test.describe(`desktop ${tier}`, () => {
      test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      test(`desktop at ${tier}`, async ({ page }) => shoot(page, 'desktop', tier, false));
    });
  }
});
