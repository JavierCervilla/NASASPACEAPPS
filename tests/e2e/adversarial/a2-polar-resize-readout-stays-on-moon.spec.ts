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
 * Adversarial repro, VENT-10, class A2 (stale state), round 2. Promise: the readout under the carried astronaut names
 * what is under its crosshair, and off the Moon it says so («Off the Moon · Let go and it walks home»). On the polar
 * map, the window resized mid-drag moves and shrinks the disk away from a still pointer, but the polar surface does not
 * tell the carry that its points moved, so the readout keeps naming a point of the Moon (and its state, on the visor)
 * while the crosshair is over the empty panel. Letting go there walks it home, which is right; the readout said
 * otherwise until then.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from '../api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');

interface Point {
  readonly x: number;
  readonly y: number;
}

/** Where a figure's feet are: the middle of its picture, 95 % down. */
async function feetOf(figure: Locator): Promise<Point> {
  const box = (await figure.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.95 };
}

async function centreOf(page: Page, selector: string): Promise<Point> {
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('desktop, 1440x900, polar map', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('A2 · the window resized mid-drag moves the disk away, and the readout says the crosshair is off the Moon', async ({
    page,
  }) => {
    // Open hardening finding (fix forward, VENT-10 adversarial pass round 2, 2026-10-31): drop this line once fixed.
    test.fail();
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await page.goto('./#polar-map');
    await expect(page.locator('.polar__disk')).toBeVisible();
    await expect(page.locator('.polar .astro-dock .astro-figure__image')).toBeVisible({ timeout: 20_000 });

    const centre = await centreOf(page, '.polar__disk');
    const target = { x: centre.x + 120, y: centre.y + 60 };
    const start = await feetOf(page.locator('.polar .astro-dock .astro-figure'));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    const carried = page.locator('.astro-carry');
    await expect(carried).toHaveAttribute('data-over', 'moon');

    // A smaller window: the disk shrinks and moves, the pointer and the crosshair stay.
    await page.setViewportSize({ width: 1200, height: 760 });
    const disk = (await page.locator('.polar__disk').boundingBox())!;
    const cross = await centreOf(page, '.astro-carry .astro-carry__cross');
    const fromDisk = Math.hypot(cross.x - (disk.x + disk.width / 2), cross.y - (disk.y + disk.height / 2));
    expect(fromDisk).toBeGreaterThan(disk.width / 2 + 20);

    await expect(carried).toHaveAttribute('data-over', 'off');
    await expect(carried.locator('.astro-readout')).toHaveText('Off the Moon · Let go and it walks home');
    await page.mouse.up();
    await expect(page.locator('.astro-pin')).toHaveCount(0);
  });
});
