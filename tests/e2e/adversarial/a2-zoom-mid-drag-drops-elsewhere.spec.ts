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
 * Adversarial repro, VENT-10, class A2 (stale state). Promise: «the drop point is where the crosshair is». Carrying the
 * astronaut with the mouse, the wheel still zooms the globe under it (pointer capture holds pointer events, not wheel
 * events), so the Moon grows under a crosshair that has not moved. The carry reads the point only on pointer moves
 * (carry-session.ts move()), so the readout keeps the old point and the drop lands on it, far from the crosshair.
 * On desktop nothing turns the globe after a drop, so the standing figure's feet are on the dropped point: they must
 * be where the crosshair was when the button came up. Since VENT-37 the pin is what is carried (dropped by a click,
 * then dragged from where it stands), its centre is the crosshair, and the standing pin's centre is its feet.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from '../api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
/** The polar spec's tolerance between a drop target and the standing figure's feet. */
const TOLERANCE_PX = 3;

interface Point {
  readonly x: number;
  readonly y: number;
}

/** Where a pin's point is: the middle of its box. */
async function feetOf(pin: Locator): Promise<Point> {
  const box = (await pin.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * The carried readout once it has stopped changing (three reads 200 ms apart agree): the globe is at rest under the
 * crosshair, and the last pointer move has been read. A touch move reaches the page on the next frame, so a readout
 * read right after one still names the move before it (1 px is about 0.4° on this globe).
 */
async function readoutAtRest(page: Page): Promise<string> {
  const coords = page.locator('.pin-carry .pin-readout__coords');
  let last = await coords.textContent();
  for (let still = 0; still < 3; ) {
    await page.waitForTimeout(200);
    const now = await coords.textContent();
    still = now === last ? still + 1 : 0;
    last = now;
  }
  return last ?? '';
}

async function centreOf(page: Page, selector: string): Promise<Point> {
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('A2 · zooming with the wheel while carrying, the pin lands under the crosshair', async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await page.goto('./');
    await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible({ timeout: GLOBE_START_MS });

    const middle = await centreOf(page, '.globe-viewport');
    const target = { x: middle.x + 60, y: middle.y + 40 };
    // The pin, dropped by a click where the globe's middle is, then carried from there.
    await page.mouse.click(middle.x - 60, middle.y - 40);
    await expect(page.locator('.pin')).toBeVisible();
    const start = await feetOf(page.locator('.pin'));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await expect(page.locator('.pin-carry')).toHaveAttribute('data-over', 'moon');
    // Zoom in to place it more precisely, the button still down and the mouse still.
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(1200);
    await readoutAtRest(page);
    const cross = await centreOf(page, '.pin-carry .pin-carry__pin');
    await page.mouse.up();

    await expect(page.locator('.pin-carry')).toHaveCount(0);
    const pin = page.locator('.pin');
    await expect(pin).toBeVisible();
    const feet = await feetOf(pin);
    expect(Math.abs(feet.x - cross.x)).toBeLessThan(TOLERANCE_PX);
    expect(Math.abs(feet.y - cross.y)).toBeLessThan(TOLERANCE_PX);
  });
});
