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

// `.graticule-label` named two things (VENT-52): the polar map's five labels (polar.css) and the globe's moving
// chips (orientation.css), in rules of the same specificity, so the stylesheet that came last won both. The bundle put
// orientation.css last: the polar labels wore the globe's chip and its `top: 0; left: 0; translate: -50% -50%`, and
// all five piled up on the disk's top left corner. The globe's rules are scoped to its layer now; these checks hold
// each label to the look its own stylesheet gives it, whatever the order.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const GLOBE_START_MS = 20_000;
const CANVAS = new Date('2026-11-22T20:00:00Z');

async function open(page: Page, hash: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(CANVAS);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.pinHint', 'seen');
    localStorage.setItem('ventana.dataSource', 'computed');
  });
  await stubApi(page);
  await page.goto(`./${hash}`);
}

const boxOf = async (locator: Locator) => (await locator.boundingBox())!;

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the polar map\'s labels stand around its disk, as polar.css places them, without the globe\'s chip', async ({ page }) => {
    await open(page, '#polar-map');
    const disk = page.locator('.polar__disk');
    await expect(disk).toBeVisible({ timeout: GLOBE_START_MS });
    const d = await boxOf(disk);
    const label = (side: string) => page.locator(`.polar .graticule-label--${side}`);
    const [top, right, bottom, left] = await Promise.all(['top', 'right', 'bottom', 'left'].map((s) => boxOf(label(s))));
    const midX = d.x + d.width / 2;
    const midY = d.y + d.height / 2;
    // 0° over the disk and 180° under it, each centred on it; 90° E right of it and 90° W left of it, mid height.
    expect(Math.abs(top!.x + top!.width / 2 - midX)).toBeLessThan(1);
    expect(top!.y + top!.height).toBeLessThanOrEqual(d.y);
    expect(Math.abs(bottom!.x + bottom!.width / 2 - midX)).toBeLessThan(1);
    expect(bottom!.y).toBeGreaterThanOrEqual(d.y + d.height);
    expect(right!.x).toBeGreaterThanOrEqual(d.x + d.width);
    expect(Math.abs(right!.y + right!.height / 2 - midY)).toBeLessThan(1);
    expect(left!.x + left!.width).toBeLessThanOrEqual(d.x);
    expect(Math.abs(left!.y + left!.height / 2 - midY)).toBeLessThan(1);
    const looks = await page.locator('.polar .graticule-label').evaluateAll((els) =>
      els.map((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, padding: s.padding, fontSize: s.fontSize };
      }));
    const plain = { background: 'rgba(0, 0, 0, 0)', padding: '0px' };
    // 12 px (0.75rem) on the four sides, 11 px (0.6875rem) on the 85° S parallel.
    expect(looks).toEqual([
      ...Array.from({ length: 4 }, () => ({ ...plain, fontSize: '12px' })),
      { ...plain, fontSize: '11px' },
    ]);
  });

  test('the globe\'s labels keep their chip', async ({ page }) => {
    await open(page, '#globe');
    const labels = page.locator('.globe-graticule .graticule-label:not([hidden])');
    await expect(labels.first()).toBeVisible({ timeout: GLOBE_START_MS });
    const looks = await labels.evaluateAll((els) =>
      els.map((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.padding, s.borderRadius, s.fontSize, s.translate, s.top, s.left].join(' | ');
      }));
    // 11 px, the type scale's caption and the floor for text (VENT-55, C-24).
    expect(new Set(looks)).toEqual(new Set(['rgba(28, 28, 30, 0.61) | 2px 4px | 4px | 11px | -50% -50% | 0px | 0px']));
  });
});
