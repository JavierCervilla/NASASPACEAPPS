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
 * Adversarial repro, VENT-10, class A2 (stale state). Promise: «the drop point is where the crosshair is». On a phone,
 * lifting the astronaut drops the sheet to peek, so the globe re-frames the selected site on its springs and the Moon
 * slides under a finger that has stopped. The carry reads the point only on pointer moves (carry-session.ts move()),
 * so a finger that stops and lets go drops the point that WAS under the crosshair a moment ago, not the one under it.
 * Two pages with the same phone and the same instant: the first learns the point under the resting crosshair (a 1 px
 * wiggle and back makes the carry read it again), the second carries the same way and lets go without the wiggle.
 * Both must name the same point, within the server's grid.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from '../api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
/** How often the resting globe and readout are read; three equal reads in a row are at rest. */
const STILL_EVERY_MS = 200;
/** Two grid steps: a finger that did not move must land on the point it rests on. */
const TOLERANCE_DEG = 0.02;

interface Point {
  readonly x: number;
  readonly y: number;
}

async function open(page: Page): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto('./');
  await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible({ timeout: GLOBE_START_MS });
  await expect(page.locator('.astro-phone-dock .astro-figure__image')).toBeVisible({ timeout: GLOBE_START_MS });
}

/** «85.87° S, 61.34° E» as degrees, longitude east. */
function parseCoords(text: string): { lat: number; lon: number } {
  const match = /([\d.]+)° ([NS]), ([\d.]+)° ([EW])/.exec(text);
  if (!match) throw new Error(`no coordinates in «${text}»`);
  return {
    lat: Number(match[1]) * (match[2] === 'S' ? -1 : 1),
    lon: Number(match[3]) * (match[4] === 'W' ? -1 : 1),
  };
}

/**
 * The carried readout once the globe is at rest under the crosshair: the selected site's ring (placed after every
 * drawn frame) and the readout both read the same three times in a row. The ring tells the orbit's springs have
 * settled after the sheet dropped to peek, whatever the readout does; the readout tells the last pointer move has been
 * read (a touch move reaches the page on the next frame, and 1 px is about 0.4° on this globe).
 */
async function readoutAtRest(page: Page): Promise<string> {
  const read = () =>
    page.evaluate(() => {
      const ring = document.querySelector<HTMLElement>('.globe-ring')?.style.transform ?? '';
      const coords = document.querySelector('.astro-carry .astro-readout__coords')?.textContent ?? '';
      return { ring, coords };
    });
  let last = await read();
  for (let still = 0; still < 3; ) {
    await page.waitForTimeout(STILL_EVERY_MS);
    const now = await read();
    still = now.ring === last.ring && now.coords === last.coords ? still + 1 : 0;
    last = now;
  }
  return last.coords;
}

/** A finger from the dock to the Moon in three quick moves, then at rest; returns how to touch and where it rests. */
async function carryAndRest(page: Page) {
  const ring = (await page.locator('.globe-ring').boundingBox())!;
  const to = { x: ring.x + ring.width / 2 - 30, y: ring.y + 40 };
  const dock = (await page.locator('.astro-phone-dock').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: Point) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [{ x: at.x, y: at.y }] : [] });
  const from = { x: dock.x + dock.width / 2, y: dock.y + dock.height / 2 };
  await touch('touchStart', from);
  for (let i = 1; i <= 3; i++) {
    await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / 3, y: from.y + ((to.y - from.y) * i) / 3 });
  }
  await expect(page.locator('.astro-carry')).toHaveAttribute('data-over', 'moon');
  await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'peek');
  await readoutAtRest(page);
  return { touch, to };
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('A2 · a finger that stops and lets go drops the point under the crosshair, not the one before the globe turned', async ({
    page,
    context,
  }) => {
    // The point under the resting crosshair, read again by a 1 px wiggle that ends where it started.
    await open(page);
    const probe = await carryAndRest(page);
    await probe.touch('touchMove', { x: probe.to.x + 1, y: probe.to.y });
    await probe.touch('touchMove', probe.to);
    const truth = parseCoords(await readoutAtRest(page));
    await probe.touch('touchEnd');
    // One globe at a time: the first page's globe would keep drawing beside the second's.
    await page.close();

    // The same carry on a fresh page, let go at rest.
    const second = await context.newPage();
    await open(second);
    const shown = await carryAndRest(second);
    const readout = parseCoords((await second.locator('.astro-carry .astro-readout__coords').textContent())!);
    await shown.touch('touchEnd');
    await expect(second.locator('.astro-pin')).toBeVisible();
    const params = new URL(second.url()).searchParams;
    const dropped = { lat: Number(params.get('lat')), lon: Number(params.get('lon')) };

    // The readout at rest already named the dropped point: what the person saw is what they got, but it is stale.
    expect(dropped).toEqual(readout);
    expect(Math.abs(dropped.lat - truth.lat)).toBeLessThanOrEqual(TOLERANCE_DEG);
    expect(Math.abs(dropped.lon - truth.lon)).toBeLessThanOrEqual(TOLERANCE_DEG);
  });
});
