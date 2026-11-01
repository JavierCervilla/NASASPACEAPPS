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
 * Both must name the same point, within the server's grid. Since VENT-37 the pin is what is carried: a finger held on
 * the Moon drops it first, then lifts it again from where it stands, which drops the sheet to peek as before.
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
}

/** A finger through Chrome's touch events (pointer type «touch»). */
async function fingerOn(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  return (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: Point) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [{ x: at.x, y: at.y }] : [] });
}

/**
 * Drops the pin with a held finger above the selected site's ring, at least 50 px from every marker (Chrome's touch
 * adjustment hands a finger near a marker to the marker), and returns where it stands.
 */
async function dropPin(page: Page): Promise<Point> {
  const ring = (await page.locator('.globe-ring').boundingBox())!;
  const at = await page.evaluate((from) => {
    const markers = [...document.querySelectorAll('.globe-marker')].map((el) => el.getBoundingClientRect());
    const sheet = document.querySelector('.sheet')!.getBoundingClientRect().top;
    for (let dy = -40; dy > -400; dy -= 10) {
      for (const dx of [0, -40, 40, -80, 80]) {
        const p = { x: from.x + dx, y: from.y + dy };
        const clear = markers.every((m) => m.width === 0 || Math.hypot(m.x + m.width / 2 - p.x, m.y + m.height / 2 - p.y) > 50);
        if (clear && p.y < sheet - 120 && document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS') return p;
      }
    }
    throw new Error('no free point on the Moon');
  }, { x: ring.x + ring.width / 2, y: ring.y + ring.height / 2 });
  const touch = await fingerOn(page);
  await touch('touchStart', at);
  await page.waitForTimeout(700);
  await touch('touchEnd');
  await expect(page.locator('.pin')).toBeVisible();
  await expect(page.locator('.pin-carry')).toHaveCount(0);
  return at;
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
 * The carried readout once the globe is at rest under the crosshair: the standing pin (placed after every drawn
 * frame, while it is carried too) and the readout both read the same three times in a row. The pin tells the orbit's springs have
 * settled after the sheet dropped to peek, whatever the readout does; the readout tells the last pointer move has been
 * read (a touch move reaches the page on the next frame, and 1 px is about 0.4° on this globe).
 */
async function readoutAtRest(page: Page): Promise<string> {
  const read = () =>
    page.evaluate(() => {
      const ring = document.querySelector<HTMLElement>('.pin')?.style.transform ?? '';
      const coords = document.querySelector('.pin-carry .pin-readout__coords')?.textContent ?? '';
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

/**
 * A finger from the standing pin over the Moon in three quick moves, then at rest; returns how to touch and where it
 * rests. The pin rides 64 px above the finger.
 */
async function carryAndRest(page: Page) {
  const pin = await dropPin(page);
  const to = { x: pin.x - 30, y: pin.y + 40 };
  const touch = await fingerOn(page);
  const box = (await page.locator('.pin').boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await touch('touchStart', from);
  for (let i = 1; i <= 3; i++) {
    await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / 3, y: from.y + ((to.y - from.y) * i) / 3 });
  }
  await expect(page.locator('.pin-carry')).toHaveAttribute('data-over', 'moon');
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
    const readout = parseCoords((await second.locator('.pin-carry .pin-readout__coords').textContent())!);
    await shown.touch('touchEnd');
    await expect(second.locator('.pin-carry')).toHaveCount(0);
    await expect(second.locator('.pin')).toBeVisible();
    const params = new URL(second.url()).searchParams;
    const dropped = { lat: Number(params.get('lat')), lon: Number(params.get('lon')) };

    // The readout at rest already named the dropped point: what the person saw is what they got, but it is stale.
    expect(dropped).toEqual(readout);
    expect(Math.abs(dropped.lat - truth.lat)).toBeLessThanOrEqual(TOLERANCE_DEG);
    expect(Math.abs(dropped.lon - truth.lon)).toBeLessThanOrEqual(TOLERANCE_DEG);
  });
});
