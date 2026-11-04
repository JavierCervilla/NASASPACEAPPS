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
 * Surface maps that land after the first frame gave up on them (VENT-72): the view says it is working while they are
 * pending, and when they land the ground gets its photographed regolith on one more frame, then rests.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;
/** The first frame gives up on the maps after 5 s (`MAPS_GIVE_UP_MS`). */
const GIVE_UP_MS = 5000;

interface Ground {
  withMap: number;
  withoutMap: number;
}

/** Counts the ground shader's compiles with and without the regolith map. */
async function countGround(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const ground: Ground = { withMap: 0, withoutMap: 0 };
    (window as unknown as { __ground: Ground }).__ground = ground;
    const proto = WebGL2RenderingContext.prototype;
    const source = proto.shaderSource;
    proto.shaderSource = function (this: WebGL2RenderingContext, shader: WebGLShader, text: string) {
      if (text.includes('vLit') && text.includes('pc_fragColor')) {
        if (text.includes('#define USE_MAP')) ground.withMap += 1;
        else ground.withoutMap += 1;
      }
      return source.call(this, shader, text);
    };
  });
}

const ground = (page: Page) => page.evaluate(() => (window as unknown as { __ground: Ground }).__ground);

test('maps that land after the first frame are drawn on one more frame, and the view says it works meanwhile', async ({ page }) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((done) => { release = done; });
  await page.route(/on-foot-(regolith|earth).*\.webp/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await countGround(page);
  await stubApi(page);
  await stubTile(page, {});
  await stubWall(page, 100, 140);
  await page.goto('./?site=im2-athena&quality=low&onfoot=far,rocks,shade,shadows');
  await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
  const host = page.getByRole('application', { name: 'On foot at the site' });
  const frames = async () => Number(await host.getAttribute('data-frames'));
  await expect(host).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(frames, { timeout: START_MS }).toBeGreaterThan(0);
  await page.waitForTimeout(GIVE_UP_MS / 2);
  await expect(host, 'pending maps are work still to come').toHaveAttribute('data-working', 'true');
  expect((await ground(page)).withMap, 'drawn without the map so far').toBe(0);

  const before = await frames();
  release();
  await expect.poll(frames, { timeout: START_MS }).toBeGreaterThan(before);
  await expect.poll(async () => (await ground(page)).withMap, { timeout: START_MS }).toBeGreaterThan(0);
  await expect(host).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  const settled = await frames();
  await page.waitForTimeout(1500);
  expect(await frames(), 'then idle').toBe(settled);
});
