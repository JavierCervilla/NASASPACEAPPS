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
 * The pin (VENT-37, which replaces the astronaut of VENT-10 as the way to pick a point): a click on the globe or the
 * polar map drops it there (desktop), a finger held still lifts it (phone); it is dragged again with the live
 * readout, springs back off the Moon or on Escape; a press that travels still turns the globe and a click on a site
 * marker still selects the site; the custom point's card and pill (computed, then Horizons), the address
 * (`?lat&lon`), picking a listed site takes it away, «Drop a pin» and the keyboard, the first-time hint, reduced
 * motion, the production CSP, 200 % text and the pseudo-locale. Also kept from VENT-10: the Layers key clear of the
 * Moon and of the polar disk, and the card's state badge without an image.
 *
 * `CAPTURE_EVIDENCE=1` also keeps screenshots in production/qa/evidence/.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-11-01';
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
/** A finger held this long lifts the pin (pin/place-press.ts HOLD_MS is 450 ms). */
const HOLD_WAIT_MS = 700;
/** How far above a fingertip a dragged pin rides (pin/carry-geometry.ts TOUCH_LIFT_PX is 64 px). */
const MIN_LIFT_PX = 60;
/** The globe's start framing puts the selected site, IM-2, here; the point the address names below is near it. */
const POINT = '?lat=-85.87&lon=61.34';

const CARRY = '.pin-carry';
const PIN = '.pin';
const LIVE = '[data-pin-live]';
const HINT = '.pin-hint';

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: new URL(`${DATE}-vent-37-${name}.png`, OUT).pathname });
}

/** Opens the page at the fixed instant with the API stubbed; `hold` keeps the custom point's Horizons answer back. */
async function open(page: Page, path = './', hold?: Promise<void>): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page, { pointHold: hold });
  await page.goto(path);
  // `:visible`: on the polar map the globe still starts, hidden, and comes first in the page.
  await expect(page.locator('.globe-viewport[data-status="ready"]:visible, .polar:visible').first()).toBeVisible({ timeout: GLOBE_START_MS });
}

/** The middle of an element's box. */
async function centreOf(locator: Locator): Promise<Point> {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The middle of the globe's canvas: on the Moon at the desktop framing. */
const moonMiddle = (page: Page) => centreOf(page.locator('.globe-viewport'));

/** Presses the mouse at `from` and moves it to `to` in steps; the button stays down. */
async function carry(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
  }
}

/** «85.87° S, 61.34° E» as degrees, longitude east. */
function parseCoords(text: string): { lat: number; lon: number } {
  const match = /([\d.]+)° ([NS]), ([\d.]+)° ([EW])/.exec(text);
  if (!match) throw new Error(`no coordinates in «${text}»`);
  const lat = Number(match[1]) * (match[2] === 'S' ? -1 : 1);
  const lon = Number(match[3]) * (match[4] === 'W' ? -1 : 1);
  return { lat, lon };
}

/** The carried readout once three reads 200 ms apart agree: the globe is at rest under the pin. */
async function readoutAtRest(page: Page): Promise<string> {
  const coords = page.locator(`${CARRY} .pin-readout__coords`);
  let last = await coords.textContent();
  for (let still = 0; still < 3; ) {
    await page.waitForTimeout(200);
    const now = await coords.textContent();
    still = now === last ? still + 1 : 0;
    last = now;
  }
  return last ?? '';
}

/** The point the address names. */
const addressPoint = (page: Page) => {
  const params = new URL(page.url()).searchParams;
  return { lat: Number(params.get('lat')), lon: Number(params.get('lon')) };
};

const distance = (a: Point, b: Point): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Expects `a` within `px` of `b` on both axes. */
function expectNear(a: Point, b: Point, px: number): void {
  expect(Math.abs(a.x - b.x)).toBeLessThan(px);
  expect(Math.abs(a.y - b.y)).toBeLessThan(px);
}

/** The CSP nginx sends for the built site, as data-source.spec.ts serves it. */
async function underPolicy(page: Page): Promise<void> {
  const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
  const policy = /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
  await page.route(/\/(\?.*)?(#.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { violations: string[] }).violations = violations;
    document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
}

test.describe('desktop, 1440x900: the pin on the globe', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a click on the Moon drops the pin on that point; the card answers, computed then Horizons', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((done) => (release = done));
    const asked: URL[] = [];
    page.on('request', (r) => r.url().includes('/api/v1/ephemeris') && asked.push(new URL(r.url())));
    await open(page, './', held);
    await expect(page.locator(HINT)).toContainText('Click the Moon to drop a pin');
    await evidence(page, 'hint-desktop');
    const target = await moonMiddle(page);
    await page.mouse.click(target.x, target.y);

    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    // The pin's centre is the point clicked, and the address names it.
    expectNear(await centreOf(pin), target, 1.5);
    const point = addressPoint(page);
    expect(point.lat).toBeLessThan(-60);
    // The first drop retires the hint for good.
    await expect(page.locator(HINT)).toHaveCount(0);
    const card = page.getByRole('complementary', { name: 'Site card' });
    await expect(card.locator('.card-head__name')).toHaveText('Custom point');
    await expect(card.locator('.card-head__place')).toHaveText(/^Near .+ · [\d.]+ km$/);
    await expect(card.locator('.card-head__point')).toHaveText(/° S, .*° [EW] · pinned here$/);
    const badge = card.locator('.card-head__badge');
    await expect(badge).toHaveAttribute('data-computed', 'true');
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    // While computed the dot is hollow; the pin wears the state's colour.
    const state = await pin.getAttribute('data-state');
    expect(['window', 'sun', 'earth', 'none']).toContain(state);
    expect(await pin.locator('.pin__mark').evaluate((el) => getComputedStyle(el, '::before').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await page.waitForTimeout(700);
    await evidence(page, 'drop-globe-computed');
    release();
    await expect(badge).toHaveAttribute('data-computed', 'false');
    await expect(badge).toHaveAttribute('data-tone', 'window');
    await expect(pin).toHaveAttribute('data-state', 'window');
    expect(await pin.locator('.pin__mark').evaluate((el) => getComputedStyle(el, '::before').backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect(asked.length).toBeGreaterThan(0);
    for (const url of asked) {
      expect({ lat: Number(url.searchParams.get('lat')), lon: Number(url.searchParams.get('lon')) }).toEqual(point);
    }
    await evidence(page, 'drop-globe-horizons');
  });

  test('dragged again, the pin reads the point and its state under its centre, and lands there', async ({ page }) => {
    await open(page);
    const middle = await moonMiddle(page);
    await page.mouse.click(middle.x, middle.y);
    const first = addressPoint(page);
    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    const target = { x: middle.x + 40, y: middle.y + 30 };
    await carry(page, await centreOf(pin), target);
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-over', 'moon');
    await expect(pin).toHaveAttribute('data-carried', 'true');
    const state = await layer.getAttribute('data-state');
    expect(['window', 'sun', 'earth', 'none']).toContain(state);
    await expect(layer.locator('.pin-readout__state')).toHaveAttribute('data-tone', state!);
    // Grabbed at its centre, the pin's centre is under the pointer: the drop point (once the last move is drawn).
    await expect.poll(async () => distance(await centreOf(layer.locator('.pin-carry__pin')), target)).toBeLessThan(1.5);
    const readout = parseCoords((await layer.locator('.pin-readout__coords').textContent())!);
    await evidence(page, 'drag-globe');
    await page.mouse.up();

    await expect(layer).toHaveCount(0);
    expect(addressPoint(page)).toEqual(readout);
    expect(addressPoint(page)).not.toEqual(first);
    await expect(pin).toHaveAttribute('data-carried', 'false');
    expectNear(await centreOf(pin), target, 3);
    // A tap on the pin keeps its point selected.
    await pin.click();
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
  });

  test('let go off the Moon, it springs back and nothing changes', async ({ page }) => {
    await open(page, `./${POINT}`);
    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    const before = new URL(page.url()).search;
    const box = (await page.locator('.globe-viewport').boundingBox())!;
    await carry(page, await centreOf(pin), { x: box.x + box.width - 60, y: box.y + 60 });
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-over', 'off');
    await expect(layer.locator('.pin-readout')).toHaveText('Off the Moon · Let go to cancel');
    await evidence(page, 'drag-off');
    await page.mouse.up();
    await expect(layer).toHaveAttribute('data-phase', 'return');
    await expect(layer).toHaveCount(0);
    expect(new URL(page.url()).search).toBe(before);
    await expect(pin).toHaveAttribute('data-carried', 'false');
  });

  test('Escape cancels a drag over the Moon', async ({ page }) => {
    await open(page, `./${POINT}`);
    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    const start = await centreOf(pin);
    await carry(page, start, { x: start.x + 50, y: start.y + 20 });
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.locator(CARRY)).toHaveCount(0);
    expect(new URL(page.url()).search).toBe(POINT);
  });

  test('the window resized mid-drag, it reads the Moon now under the pin and lands there', async ({ page }) => {
    await open(page);
    const middle = await moonMiddle(page);
    await page.mouse.click(middle.x, middle.y);
    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    const target = { x: middle.x + 60, y: middle.y + 40 };
    await carry(page, await centreOf(pin), target);
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    const before = await readoutAtRest(page);
    // The globe's canvas is resized and the Moon moves under a pointer that has not.
    await page.setViewportSize({ width: 1360, height: 860 });
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    const after = await readoutAtRest(page);
    expect(after).not.toBe(before);
    const cross = await centreOf(page.locator(`${CARRY} .pin-carry__pin`));
    await page.mouse.up();

    await expect(page.locator(CARRY)).toHaveCount(0);
    expect(addressPoint(page)).toEqual(parseCoords(after));
    expectNear(await centreOf(pin), cross, 3);
  });

  test('a click on a site marker selects that site; a press that travels turns the globe; neither drops a pin', async ({ page }) => {
    await open(page);
    const ring = page.locator('.globe-ring');
    await expect(ring).toBeVisible();
    // A marker the pointer reaches at its centre (not under another one), clicked where it is.
    const marker = await page.evaluate(() => {
      for (const el of document.querySelectorAll<HTMLElement>('.globe-marker[aria-pressed="false"]')) {
        const box = el.getBoundingClientRect();
        const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        if (box.width > 0 && document.elementFromPoint(at.x, at.y) === el) return { id: el.dataset['siteId']!, ...at };
      }
      throw new Error('no marker in reach');
    });
    await page.mouse.click(marker.x, marker.y);
    await expect(page.locator(`.globe-marker[data-site-id="${marker.id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.site-button__name')).not.toHaveText('IM-2 Athena');
    await expect(page.locator(PIN)).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('lat')).toBe(false);

    const before = await centreOf(ring);
    const middle = await moonMiddle(page);
    await carry(page, middle, { x: middle.x + 10, y: middle.y - 80 });
    await page.mouse.up();
    // The globe turned: the selected site's ring moved with it.
    await expect.poll(async () => before.y - (await centreOf(ring)).y).toBeGreaterThan(20);
    await expect(page.locator(PIN)).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('lat')).toBe(false);
  });

  test('the address opens the custom point, beside ?site=, and ignores a broken one', async ({ page }) => {
    await open(page, './?site=apollo11&lat=-85.874&lon=61.339');
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    await expect(page.locator('.site-button__place')).toContainText('85.87° S, 61.34° E');
    await expect(page.locator(PIN)).toBeVisible();

    await open(page, './?lat=north&lon=3');
    await expect(page.locator('.site-button__name')).toHaveText('IM-2 Athena');
    await expect(page.locator(PIN)).toHaveCount(0);
  });

  test('a point out of range or not a plain decimal opens nothing, and ?site= still does', async ({ page }) => {
    for (const search of ['?lat=-200&lon=10', '?lat=-85&lon=999', '?lat=0x10&lon=3', '?lat=1e1&lon=3']) {
      await open(page, `./${search}`);
      await expect(page.locator('.site-button__name')).toHaveText('IM-2 Athena');
      await expect(page.locator(PIN)).toHaveCount(0);
    }
    await open(page, './?site=apollo11&lat=-85&lon=999');
    await expect(page.locator('.site-button__name')).toHaveText('Apollo 11');
    await expect(page.locator(PIN)).toHaveCount(0);
  });

  test('picking a listed site takes the pin and its point away, so a reload opens that site', async ({ page }) => {
    await open(page, './?site=im2-athena');
    const middle = await moonMiddle(page);
    await page.mouse.click(middle.x, middle.y);
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    expect(new URL(page.url()).searchParams.has('lat')).toBe(true);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.locator('.site-button__name')).toHaveText('Apollo 11');
    await expect(page.locator(PIN)).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('?site=apollo11');
    await page.reload();
    await expect(page.locator('.site-button__name')).toHaveText('Apollo 11');
  });

  test('«Drop a pin» with the keyboard lifts it over the selected site, the arrows move it, Enter drops it, said in a live region', async ({ page }) => {
    await open(page);
    const button = page.getByRole('button', { name: 'Drop a pin' });
    await button.focus();
    await page.keyboard.press('Enter');
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-mode', 'keys');
    await expect(page.locator(LIVE)).toContainText('Pin lifted at');
    // It starts over the selected site, IM-2.
    const start = parseCoords((await layer.locator('.pin-readout__coords').textContent())!);
    expect(start.lat).toBeCloseTo(-84.79, 0);
    await page.keyboard.press('Shift+ArrowUp');
    await expect(page.locator(LIVE)).not.toContainText('lifted');
    const moved = parseCoords((await page.locator(LIVE).textContent())!);
    expect(moved).not.toEqual(start);
    await page.keyboard.press('Enter');
    await expect(layer).toHaveCount(0);
    await expect(page.locator(LIVE)).toHaveText(
      /^Pin dropped at \d+\.\d+° S, \d+\.\d+° [EW]: .+\. To move it, press Enter on the pin\.$/,
    );
    await expect(button).toBeFocused();
    expect(addressPoint(page)).toEqual(moved);
    const pin = page.getByRole('button', { name: /^Pin at \d/ });
    await expect(pin).toBeVisible();
    // From the pin, Escape puts it back where it stood.
    await pin.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Escape');
    await expect(layer).toHaveCount(0);
    expect(addressPoint(page)).toEqual(moved);
    await expect(page.locator(LIVE)).toHaveText('Cancelled: nothing changed.');
  });

  test('«Drop a pin» clicked drops it at once on the selected site', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Drop a pin' }).click();
    await expect(page.locator(PIN)).toBeVisible();
    expect(addressPoint(page)).toEqual({ lat: -84.79, lon: 29.2 });
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    await expect(page.locator(LIVE)).toContainText('Pin dropped at 84.79° S, 29.20° E');
  });

  test('the hint goes with its ✕, and stays gone after a reload', async ({ page }) => {
    await open(page);
    const hint = page.locator(HINT);
    await expect(hint).toBeVisible();
    // Above the globe, clear of the Layers key.
    const key = (await page.locator('.globe .globe-layers').boundingBox())!;
    const box = (await hint.boundingBox())!;
    expect(box.y + box.height).toBeLessThan(key.y);
    await hint.getByRole('button', { name: 'Dismiss the hint' }).click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.site-button__name')).toHaveText('IM-2 Athena');
    await expect(hint).toHaveCount(0);
  });

  test('under reduced motion the pin drops without its fall, and fades home instead of travelling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, `./${POINT}`);
    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    expect(await pin.locator('.pin__mark').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    const box = (await page.locator('.globe-viewport').boundingBox())!;
    await carry(page, await centreOf(pin), { x: box.x + box.width - 60, y: box.y + 60 });
    const layer = page.locator(CARRY);
    expect(await layer.locator('.pin-carry__pin').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    // The fade lasts 160 ms (FADE_MS), shorter than a round trip under load: note where the pin is the moment the
    // return starts, in the page, instead of asking afterwards.
    await layer.evaluate((el) => {
      const seen = window as unknown as { returnLeft?: number };
      new MutationObserver(() => {
        const carried = el.querySelector('.pin-carry__pin');
        if (el.getAttribute('data-phase') === 'return' && carried && seen.returnLeft === undefined) {
          seen.returnLeft = carried.getBoundingClientRect().x;
        }
      }).observe(el, { attributes: true, attributeFilter: ['data-phase'] });
    });
    await page.mouse.up();
    await expect(layer).toHaveCount(0);
    const left = await page.evaluate(() => (window as unknown as { returnLeft?: number }).returnLeft);
    expect(left).toBeGreaterThan(box.x + box.width - 200);
  });

  test('the production CSP allows the hint, the click, the drag and the drop', async ({ page }) => {
    await underPolicy(page);
    await open(page);
    await expect(page.locator(HINT)).toBeVisible();
    const middle = await moonMiddle(page);
    await page.mouse.click(middle.x, middle.y);
    await expect(page.locator(PIN)).toBeVisible();
    await carry(page, await centreOf(page.locator(PIN)), { x: middle.x + 30, y: middle.y + 20 });
    await page.mouse.up();
    await expect(page.locator(CARRY)).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  });

  test('the Layers key stays clear of the Moon, so all of it in view takes the pin', async ({ page }) => {
    await open(page);
    await expect(page.locator('.globe-ring')).toBeVisible();
    const key = (await page.locator('.globe .globe-layers').boundingBox())!;
    // With the key out of the way, the ground under it is the dark sky, not the Moon.
    await page.locator('.globe .globe-layers').evaluate((el) => ((el as HTMLElement).style.visibility = 'hidden'));
    const shot = await page.screenshot({ clip: key });
    const { brightest } = await page.evaluate(async (png) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, image.width, image.height).data;
      let max = 0;
      for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i]!, data[i + 1]!, data[i + 2]!);
      return { brightest: max };
    }, shot.toString('base64'));
    expect(brightest).toBeLessThan(70);
  });

  test('a site with no image shows its state badge in the card head', async ({ page }) => {
    await open(page, './?site=apollo11');
    await expect(page.locator('.site-button__name')).toHaveText('Apollo 11');
    const card = page.getByRole('complementary', { name: 'Site card' });
    await expect(card.locator('.card-media')).toHaveCount(0);
    await expect(card.locator('.card-head__badge')).toBeVisible();
    await expect(card.locator('.card-head__badge')).toHaveText(/Neither/);
  });

  test('at 200 % text «Drop a pin» stays whole inside the Layers key, and the hint inside the view', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const view = (await page.locator('.globe').boundingBox())!;
    const hint = (await page.locator(HINT).boundingBox())!;
    expect(hint.x).toBeGreaterThanOrEqual(view.x);
    expect(hint.x + hint.width).toBeLessThanOrEqual(view.x + view.width + 0.5);
    const key = page.locator('.globe .globe-layers');
    if (!(await key.isVisible())) return;
    const box = (await key.boundingBox())!;
    const own = (await key.locator('.pin-drop').boundingBox())!;
    expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    await evidence(page, 'drop-button-200-text');
  });

  test('in the pseudo-locale «Drop a pin» and the hint stay whole', async ({ page }) => {
    await open(page, './en-xa/');
    const key = page.locator('.globe .globe-layers');
    const box = (await key.boundingBox())!;
    const label = key.locator('.pin-drop__label');
    const own = (await label.boundingBox())!;
    expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const text = page.locator(`${HINT} .pin-hint__text`);
    expect(await text.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });
});

test.describe('desktop size with a touch screen, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: true });

  test('the hint says touch and hold where the pointer is coarse', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    await expect.poll(() => page.locator(HINT).innerText()).toBe('Touch and hold the Moon to drop a pin');
  });
});

test.describe('desktop, 1440x900: the pin on the polar map', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /** A point of the disk towards 90° E, from 0.2 of its radius outwards, where the disk itself takes a click. */
  async function freeOnDisk(page: Page, centre: Point, r: number): Promise<Point> {
    return page.evaluate(({ centre, r }) => {
      for (let share = 0.2; share < 0.5; share += 0.01) {
        for (const dy of [0, -0.05, 0.05]) {
          const at = { x: centre.x + r * share, y: centre.y + r * dy };
          const hit = document.elementFromPoint(at.x, at.y);
          if (hit?.closest('.polar__disk') && !hit.closest('button, [data-site-id]')) return at;
        }
      }
      throw new Error('no free point on the disk');
    }, { centre, r });
  }

  test('a click on the disk drops the pin there; the Layers key and the numbered sites stay clear of the disk', async ({ page }) => {
    await open(page, './#polar-map');
    const disk = page.locator('.polar__disk');
    await expect(disk).toBeVisible();
    const circle = (await disk.boundingBox())!;
    const centre = { x: circle.x + circle.width / 2, y: circle.y + circle.height / 2 };
    const r = circle.width / 2;
    for (const selector of ['.polar .globe-layers', '.polar-key']) {
      const box = (await page.locator(selector).boundingBox())!;
      const dx = Math.max(box.x - centre.x, 0, centre.x - (box.x + box.width));
      const dy = Math.max(box.y - centre.y, 0, centre.y - (box.y + box.height));
      expect(Math.hypot(dx, dy)).toBeGreaterThan(r);
    }
    await expect(page.locator(`.polar ${HINT}`)).toBeVisible();
    // Near the pole, towards 90° E, where no site's marker takes the click (a marker's click is the site's).
    const target = await freeOnDisk(page, centre, r);
    await page.mouse.click(target.x, target.y);
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    const point = addressPoint(page);
    expect(point.lat).toBeLessThan(-86);
    expect(point.lon).toBeGreaterThan(45);
    expect(point.lon).toBeLessThan(135);
    const pin = page.locator(`.polar ${PIN}`);
    await expect(pin).toBeVisible();
    expectNear(await centreOf(pin), target, 3);
    // A custom point on the map is not «off this map».
    await expect(page.locator('.polar__note')).toHaveCount(0);
    await page.waitForTimeout(700);
    await evidence(page, 'drop-polar');

    // Dragged on the disk, with the readout.
    const next = { x: centre.x + r * 0.3, y: centre.y - r * 0.2 };
    await carry(page, await centreOf(pin), next);
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    await evidence(page, 'drag-polar');
    await page.mouse.up();
    expectNear(await centreOf(pin), next, 3);
  });

  test('a click on a site marker on the disk selects the site, not a pin', async ({ page }) => {
    await open(page, './#polar-map');
    const id = await page.locator('.polar-marker[aria-pressed="false"]').first().getAttribute('data-site-id');
    const marker = page.locator(`.polar-marker[data-site-id="${id}"]`);
    await expect(marker).toBeVisible();
    await marker.click();
    await expect(marker).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(PIN)).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('lat')).toBe(false);
  });

  test('standing next to a site, the pin leaves that site’s label readable', async ({ page }) => {
    await open(page, './#polar-map');
    const label = page.locator('.polar-label', { hasText: 'Haworth' });
    await expect(label).toBeVisible();
    const box = (await label.boundingBox())!;
    // Just under the label, so the pin's target rises over its first letters.
    const target = { x: box.x + 14, y: box.y + box.height + 12 };
    await page.mouse.click(target.x, target.y);
    const pin = page.locator(`.polar ${PIN}`);
    await expect(pin).toBeVisible();
    const own = (await pin.boundingBox())!;
    const overlap = {
      x: Math.max(box.x, own.x),
      y: Math.max(box.y, own.y),
      right: Math.min(box.x + box.width, own.x + own.width),
      bottom: Math.min(box.y + box.height, own.y + own.height),
    };
    expect(overlap.right - overlap.x).toBeGreaterThan(4);
    expect(overlap.bottom - overlap.y).toBeGreaterThan(4);
    // Where the two meet, the label paints on top (it takes no pointer, so it is made hittable only to ask).
    const top = await label.evaluate((el, at) => {
      (el as HTMLElement).style.pointerEvents = 'auto';
      const hit = document.elementFromPoint(at.x, at.y);
      (el as HTMLElement).style.pointerEvents = '';
      return hit === el;
    }, { x: (overlap.x + overlap.right) / 2, y: (overlap.y + overlap.bottom) / 2 });
    expect(top).toBe(true);
  });
});

test.describe('phone, 390x844: the pin', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** A finger through Chrome's touch events (pointer type «touch»). */
  async function finger(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    return (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: Point) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [{ x: at.x, y: at.y }] : [] });
  }

  /**
   * On the Moon, above the sheet and at least 50 px from every site marker: Chrome's touch adjustment hands a finger
   * near a marker to the marker, whose press is the site's, not the pin's.
   */
  async function onTheMoon(page: Page): Promise<Point> {
    const ring = (await page.locator('.globe-ring').boundingBox())!;
    const from = { x: ring.x + ring.width / 2, y: ring.y + ring.height / 2 };
    return page.evaluate((from) => {
      const markers = [...document.querySelectorAll('.globe-marker')].map((el) => el.getBoundingClientRect());
      const sheet = document.querySelector('.sheet')!.getBoundingClientRect().top;
      for (let dy = -40; dy > -400; dy -= 10) {
        for (const dx of [0, -40, 40, -80, 80]) {
          const at = { x: from.x + dx, y: from.y + dy };
          const clear = markers.every((m) => m.width === 0 || Math.hypot(m.x + m.width / 2 - at.x, m.y + m.height / 2 - at.y) > 50);
          if (clear && at.y < sheet - 20 && document.elementFromPoint(at.x, at.y)?.tagName === 'CANVAS') return at;
        }
      }
      throw new Error('no free point on the Moon');
    }, from);
  }

  test('a finger held on the Moon lifts the pin under it; dragged, it rides above the finger; let go, it drops', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((done) => (release = done));
    await open(page, './', held);
    await expect.poll(() => page.locator(HINT).innerText()).toBe('Touch and hold the Moon to drop a pin');
    await evidence(page, 'hint-phone');
    const at = await onTheMoon(page);
    const touch = await finger(page);
    const detent = await page.locator('.sheet').getAttribute('data-detent');
    await touch('touchStart', at);
    await page.waitForTimeout(HOLD_WAIT_MS);
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-mode', 'hold');
    await expect(layer).toHaveAttribute('data-over', 'moon');
    // Lifted where the finger rests; the sheet stays, so the Moon does not move under it.
    await expect.poll(async () => distance(await centreOf(layer.locator('.pin-carry__pin')), at)).toBeLessThan(1.5);
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', detent!);
    const to = { x: at.x + 20, y: at.y + 30 };
    for (let i = 1; i <= 6; i++) await touch('touchMove', { x: at.x + (20 * i) / 6, y: at.y + (30 * i) / 6 });
    await expect.poll(async () => to.y - (await centreOf(layer.locator('.pin-carry__pin'))).y).toBeGreaterThanOrEqual(MIN_LIFT_PX);
    await evidence(page, 'drag-phone');
    await touch('touchEnd');
    await expect(layer).toHaveCount(0);
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'half');
    await expect(page.locator('.site-pill__name')).toHaveText('Custom point');
    await expect(page.locator('.summary__subtitle')).toHaveText(/^Near .+ · [\d.]+ km$/);
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-computed', 'true');
    await expect(page.locator(PIN)).toBeVisible();
    await expect(page.locator(HINT)).toHaveCount(0);
    await page.waitForTimeout(700);
    await evidence(page, 'drop-phone-computed');
    release();
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-state', 'window');
    await evidence(page, 'drop-phone-horizons');
  });

  test('a finger held and let go in place drops the point it pressed', async ({ page }) => {
    await open(page);
    const at = await onTheMoon(page);
    const touch = await finger(page);
    await touch('touchStart', at);
    await page.waitForTimeout(HOLD_WAIT_MS);
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    const readout = parseCoords((await page.locator(`${CARRY} .pin-readout__coords`).textContent())!);
    await touch('touchEnd');
    await expect(page.locator(CARRY)).toHaveCount(0);
    expect(addressPoint(page)).toEqual(readout);
  });

  test('a short tap or a swipe on the globe drops nothing', async ({ page }) => {
    await open(page);
    const at = await onTheMoon(page);
    const touch = await finger(page);
    await touch('touchStart', at);
    await touch('touchEnd');
    for (let i = 0; i <= 6; i++) {
      await touch(i === 0 ? 'touchStart' : 'touchMove', { x: at.x + i * 12, y: at.y });
    }
    await touch('touchEnd');
    await page.waitForTimeout(HOLD_WAIT_MS);
    await expect(page.locator(CARRY)).toHaveCount(0);
    await expect(page.locator(PIN)).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('');
  });

  test('«Drop a pin» in the Sites sheet drops it on the selected site, and the sheet opens on its answer', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'full');
    await evidence(page, 'sites-sheet-drop-row');
    await page.getByRole('button', { name: 'Drop a pin' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'half');
    await expect(page.locator('.site-pill__name')).toHaveText('Custom point');
    expect(addressPoint(page)).toEqual({ lat: -84.79, lon: 29.2 });
    await expect(page.locator(PIN)).toBeVisible();
  });

  for (const path of ['./', './en-xa/'] as const) {
    test(`the hint sits under the top bar, whole, and its ✕ takes it away (${path})`, async ({ page }) => {
      await open(page, path);
      const hint = page.locator(HINT);
      await expect(hint).toBeVisible();
      const bar = (await page.locator('.phone-bar').boundingBox())!;
      const box = (await hint.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await hint.getByRole('button').click();
      await expect(hint).toHaveCount(0);
    });
  }
});
