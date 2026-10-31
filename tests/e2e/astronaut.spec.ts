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
 * The draggable astronaut (VENT-10): from its dock onto the globe (desktop and phone) and the polar map, off the Moon
 * and back, Escape, picked up again from where it stands, brought home from the dock, the readout and the visor
 * following the state, the custom point's card and pill (computed, then Horizons), the address (`?lat&lon`), the
 * keyboard, reduced motion, the production CSP, 200 % text and the pseudo-locale. Also the three production fixes that
 * shipped with it: the Layers key clear of the Moon and of the polar disk, and the card's state badge without an image
 * (the dark star at the pole is checked by packages/web/tests/globe-pole.test.ts).
 *
 * `CAPTURE_EVIDENCE=1` also keeps screenshots in production/qa/evidence/.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-10-31';
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));

const DOCK = '.astro-dock';
const CARRY = '.astro-carry';
const PIN = '.astro-pin';
const LIVE = '[data-astro-live]';

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: new URL(`${DATE}-vent-10-${name}.png`, OUT).pathname });
}

/** Opens the page at the fixed instant with the API stubbed; `hold` keeps the custom point's Horizons answer back. */
async function open(page: Page, path = './', hold?: Promise<void>): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page, { pointHold: hold });
  await page.goto(path);
  await expect(page.locator('.globe-viewport[data-status="ready"], .polar').first()).toBeVisible();
}

/** Where a figure's feet are: the middle of its picture, 95 % down. */
async function feetOf(figure: Locator): Promise<Point> {
  const box = (await figure.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.95 };
}

/** The middle of the globe's canvas: on the Moon at the desktop framing. */
async function moonMiddle(page: Page): Promise<Point> {
  const box = (await page.locator('.globe-viewport').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses the mouse at `from` and moves it to `to` in steps; the button stays down. */
async function carry(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
  }
}

/** Carries the astronaut from its dock to `to` and lets go. */
async function dropFromDock(page: Page, to: Point): Promise<void> {
  await carry(page, await feetOf(page.locator(`${DOCK} .astro-figure`)), to);
  await page.mouse.up();
}

/** «85.87° S, 61.34° E» as degrees, longitude east. */
function parseCoords(text: string): { lat: number; lon: number } {
  const match = /([\d.]+)° ([NS]), ([\d.]+)° ([EW])/.exec(text);
  if (!match) throw new Error(`no coordinates in «${text}»`);
  const lat = Number(match[1]) * (match[2] === 'S' ? -1 : 1);
  const lon = Number(match[3]) * (match[4] === 'W' ? -1 : 1);
  return { lat, lon };
}

/** The point the address names. */
const addressPoint = (page: Page) => {
  const params = new URL(page.url()).searchParams;
  return { lat: Number(params.get('lat')), lon: Number(params.get('lon')) };
};

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

test.describe('desktop, 1440x900: the astronaut on the globe', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('dragged from the dock onto the Moon, it reads the point and its state, and stands there once dropped', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((done) => (release = done));
    const asked: URL[] = [];
    page.on('request', (r) => r.url().includes('/api/v1/ephemeris') && asked.push(new URL(r.url())));
    await open(page, './', held);
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'home');
    await expect(page.locator(DOCK)).toContainText('Drag me anywhere');
    // The figure is drawn from the 3D model once the page runs.
    await expect(page.locator(`${DOCK} .astro-figure__image`)).toBeVisible();

    const target = await moonMiddle(page);
    await carry(page, await feetOf(page.locator(`${DOCK} .astro-figure`)), target);
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-over', 'moon');
    const state = await layer.getAttribute('data-state');
    expect(['window', 'sun', 'earth', 'none']).toContain(state);
    // The visor wears the state under the feet; the readout says it.
    await expect(layer.locator('.astro-figure')).toHaveAttribute('data-visor', state!);
    await expect(layer.locator('.astro-readout__state')).toHaveAttribute('data-tone', state!);
    const readout = parseCoords((await layer.locator('.astro-readout__coords').textContent())!);
    // The crosshair is on the drop point: the feet, under the pointer here.
    const cross = (await layer.locator('.astro-carry__cross').boundingBox())!;
    expect(Math.abs(cross.x + cross.width / 2 - target.x)).toBeLessThan(1.5);
    expect(Math.abs(cross.y + cross.height / 2 - target.y)).toBeLessThan(1.5);
    await expect(page.locator(DOCK)).toContainText('Drop it on any point');
    await evidence(page, 'drag-globe');
    await page.mouse.up();

    await expect(layer).toHaveCount(0);
    // What was read is what the address, the card and the API get: one point, on the server's grid.
    expect(addressPoint(page)).toEqual(readout);
    const pin = page.locator(PIN);
    await expect(pin).toBeVisible();
    await expect(pin).toHaveAttribute('data-visor', state!);
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'away');
    await expect(page.locator(DOCK)).toContainText('On the Moon');
    const card = page.getByRole('complementary', { name: 'Site card' });
    await expect(card.locator('.card-head__name')).toHaveText('Custom point');
    await expect(card.locator('.card-head__place')).toHaveText(/^Near .+ · [\d.]+ km$/);
    await expect(card.locator('.card-head__point')).toHaveText(/° S, .*° [EW] · dropped here$/);
    // The answer is there at once, the simulator's (hollow), in the card's head: the custom point has no image.
    const badge = card.locator('.card-head__badge');
    await expect(badge).toHaveAttribute('data-computed', 'true');
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    await expect(page.locator('.site-button__place')).toHaveText(/^Near /);
    await evidence(page, 'drop-globe-computed');
    release();
    // Horizons' answer for the point (a window, from the stub) fills the dot.
    await expect(badge).toHaveAttribute('data-computed', 'false');
    await expect(badge).toHaveAttribute('data-tone', 'window');
    await expect(page.locator('.site-button .signal-dot')).toHaveAttribute('data-state', 'window');
    expect(asked.length).toBeGreaterThan(0);
    for (const url of asked) {
      expect({ lat: Number(url.searchParams.get('lat')), lon: Number(url.searchParams.get('lon')) }).toEqual(readout);
    }
    await expect(pin).toHaveAttribute('data-visor', 'window');
    await evidence(page, 'drop-globe-horizons');
  });

  test('let go off the Moon, it walks home and nothing changes', async ({ page }) => {
    await open(page);
    const box = (await page.locator('.globe-viewport').boundingBox())!;
    await carry(page, await feetOf(page.locator(`${DOCK} .astro-figure`)), { x: box.x + box.width - 60, y: box.y + 60 });
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-over', 'off');
    await expect(layer.locator('.astro-readout')).toHaveText('Off the Moon · Let go and it walks home');
    await expect(layer.locator('.astro-figure')).toHaveAttribute('data-visor', 'idle');
    await evidence(page, 'drag-off');
    await page.mouse.up();
    await expect(layer).toHaveAttribute('data-phase', 'return');
    await expect(layer).toHaveCount(0);
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'home');
    expect(new URL(page.url()).search).toBe('');
    await expect(page.locator('.site-button__name')).toHaveText('IM-2 Athena');
  });

  test('Escape cancels a drag over the Moon', async ({ page }) => {
    await open(page);
    await carry(page, await feetOf(page.locator(`${DOCK} .astro-figure`)), await moonMiddle(page));
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.locator(CARRY)).toHaveCount(0);
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'home');
    await expect(page.locator(PIN)).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('');
  });

  test('picked up again where it stands, it moves; the dock brings it home to the site chosen before', async ({ page }) => {
    await open(page);
    const middle = await moonMiddle(page);
    await dropFromDock(page, middle);
    const first = addressPoint(page);
    await expect(page.locator(PIN)).toBeVisible();
    await carry(page, await feetOf(page.locator(`${PIN} .astro-figure`)), { x: middle.x + 40, y: middle.y + 30 });
    // Lifted, the standing figure steps aside; the dock says how to cancel.
    await expect(page.locator(PIN)).toHaveAttribute('data-carried', 'true');
    await page.mouse.up();
    await expect(page.locator(CARRY)).toHaveCount(0);
    const second = addressPoint(page);
    expect(second).not.toEqual(first);
    expect(second.lon).toBeGreaterThan(first.lon - 30);
    await expect(page.locator(PIN)).toHaveAttribute('data-carried', 'false');
    // A tap on the standing figure keeps its point selected.
    await page.locator(PIN).click();
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');

    await page.getByRole('button', { name: 'Astronaut on the Moon: bring it home' }).click();
    await expect(page.locator(PIN)).toHaveCount(0);
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'home');
    await expect(page.locator('.site-button__name')).toHaveText('IM-2 Athena');
    expect(new URL(page.url()).search).toBe('');
    await expect(page.locator(LIVE)).toHaveText('The astronaut is back home.');
  });

  test('the address opens the custom point, beside ?site=, and ignores a broken one', async ({ page }) => {
    await open(page, './?site=apollo11&lat=-85.874&lon=61.339');
    await expect(page.locator('.site-button__name')).toHaveText('Custom point');
    await expect(page.locator('.site-button__place')).toContainText('85.87° S, 61.34° E');
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'away');
    await page.getByRole('button', { name: 'Astronaut on the Moon: bring it home' }).click();
    await expect(page.locator('.site-button__name')).toHaveText('Apollo 11');
    expect(new URL(page.url()).search).toBe('?site=apollo11');

    await open(page, './?lat=north&lon=3');
    await expect(page.locator('.site-button__name')).toHaveText('IM-2 Athena');
    await expect(page.locator(DOCK)).toHaveAttribute('data-status', 'home');
  });

  test('the keyboard lifts it from the dock, moves it with the arrows and drops it, said in a live region', async ({ page }) => {
    await open(page);
    const dock = page.getByRole('button', { name: /^Astronaut: drag it onto the Moon/ });
    await dock.focus();
    await page.keyboard.press('Enter');
    const layer = page.locator(CARRY);
    await expect(layer).toHaveAttribute('data-mode', 'keys');
    await expect(page.locator(LIVE)).toContainText('Astronaut picked up at');
    // It starts over the selected site, IM-2.
    const start = parseCoords((await layer.locator('.astro-readout__coords').textContent())!);
    expect(start.lat).toBeCloseTo(-84.79, 0);
    await page.keyboard.press('Shift+ArrowUp');
    await expect(page.locator(LIVE)).not.toContainText('picked up');
    const moved = parseCoords((await page.locator(LIVE).textContent())!);
    expect(moved).not.toEqual(start);
    await page.keyboard.press('Enter');
    await expect(layer).toHaveCount(0);
    await expect(page.locator(LIVE)).toContainText('Astronaut dropped at');
    expect(addressPoint(page)).toEqual(moved);
    await expect(dock).toHaveCount(0);
    await expect(page.locator(PIN)).toBeVisible();
    // From the standing figure, Escape puts it back where it stood.
    await page.locator(PIN).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Escape');
    await expect(layer).toHaveCount(0);
    expect(addressPoint(page)).toEqual(moved);
    await expect(page.locator(LIVE)).toHaveText('Cancelled: the astronaut is back where it was.');
  });

  test('under reduced motion it is carried upright, and fades home instead of travelling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const box = (await page.locator('.globe-viewport').boundingBox())!;
    await carry(page, await feetOf(page.locator(`${DOCK} .astro-figure`)), { x: box.x + box.width - 60, y: box.y + 60 });
    const layer = page.locator(CARRY);
    await expect(layer.locator('.astro-figure')).toHaveAttribute('data-pose', 'stand');
    const transform = await layer.locator('.astro-carry__figure').evaluate((el) => (el as HTMLElement).style.transform);
    expect(transform).not.toContain('rotate');
    await page.mouse.up();
    await expect(layer).toHaveAttribute('data-phase', 'return');
    const left = (await layer.locator('.astro-carry__figure').boundingBox())!.x;
    await expect(layer).toHaveCount(0);
    expect(left).toBeGreaterThan(box.x + box.width - 200);
  });

  test('the production CSP allows the figure, the drag and the drop', async ({ page }) => {
    await underPolicy(page);
    await open(page);
    await expect(page.locator(`${DOCK} .astro-figure__image`)).toBeVisible();
    await dropFromDock(page, await moonMiddle(page));
    await expect(page.locator(PIN)).toBeVisible();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  });

  test('the Layers key stays clear of the Moon, so all of it in view takes the astronaut', async ({ page }) => {
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
    await evidence(page, 'card-badge-no-image');
  });

  test('at 200 % text the dock stays whole inside the Layers key', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const key = page.locator('.globe .globe-layers');
    if (!(await key.isVisible())) return;
    const box = (await key.boundingBox())!;
    for (const part of ['.astro-dock__well', '.astro-dock__title', '.astro-dock__hint']) {
      const own = (await key.locator(part).boundingBox())!;
      expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    }
    await evidence(page, 'dock-200-text');
  });

  test('in the pseudo-locale the dock words stay inside the key', async ({ page }) => {
    await open(page, './en-xa/');
    const key = page.locator('.globe .globe-layers');
    const box = (await key.boundingBox())!;
    for (const part of ['.astro-dock__title', '.astro-dock__hint']) {
      const own = (await key.locator(part).boundingBox())!;
      expect(own.x + own.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
      expect(await key.locator(part).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
  });
});

test.describe('desktop, 1440x900: the astronaut on the polar map', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('dropped on the disk, it stands there; the Layers key and the numbered sites stay clear of the disk', async ({ page }) => {
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
    // Near the pole, a little towards 90° E.
    const target = { x: centre.x + r * 0.2, y: centre.y };
    await carry(page, await feetOf(page.locator(`.polar ${DOCK} .astro-figure`)), target);
    await expect(page.locator(CARRY)).toHaveAttribute('data-over', 'moon');
    await evidence(page, 'drag-polar');
    await page.mouse.up();
    const point = addressPoint(page);
    expect(point.lat).toBeCloseTo(-88, 0);
    expect(point.lon).toBeCloseTo(90, -1);
    const pin = page.locator(`.polar ${PIN}`);
    await expect(pin).toBeVisible();
    const feet = await feetOf(pin.locator('.astro-figure'));
    expect(Math.abs(feet.x - target.x)).toBeLessThan(3);
    expect(Math.abs(feet.y - target.y)).toBeLessThan(3);
    // A custom point on the map is not «off this map».
    await expect(page.locator('.polar__note')).toHaveCount(0);
    await evidence(page, 'drop-polar');
  });
});

test.describe('phone, 390x844: the astronaut', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** A finger from the dock to `to`, through Chrome's touch events (pointer type «touch»). */
  async function touchCarry(page: Page, to: Point, lift: (page: Page) => Promise<void>): Promise<void> {
    const dock = (await page.locator('.astro-phone-dock').boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', at?: Point) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [{ x: at.x, y: at.y }] : [] });
    const from = { x: dock.x + dock.width / 2, y: dock.y + dock.height / 2 };
    await touch('touchStart', from);
    for (let i = 1; i <= 12; i++) {
      await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / 12, y: from.y + ((to.y - from.y) * i) / 12 });
    }
    await lift(page);
    await touch('touchEnd');
  }

  test('a finger carries it over the Moon above the fingertip, the sheet steps aside, and the drop answers', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((done) => (release = done));
    await open(page, './', held);
    await expect(page.locator('.astro-phone-dock .astro-figure__image')).toBeVisible();
    const ring = (await page.locator('.globe-ring').boundingBox())!;
    const finger = { x: ring.x + ring.width / 2 - 30, y: ring.y - 20 };
    await touchCarry(page, finger, async () => {
      const layer = page.locator(CARRY);
      await expect(layer).toHaveAttribute('data-over', 'moon');
      // The feet ride above the finger, so the drop point stays in sight.
      await expect.poll(async () => {
        const cross = (await layer.locator('.astro-carry__cross').boundingBox())!;
        return finger.y - (cross.y + cross.height / 2);
      }).toBeGreaterThanOrEqual(60);
      await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'peek');
      const state = await layer.getAttribute('data-state');
      await expect(layer.locator('.astro-figure')).toHaveAttribute('data-visor', state!);
      await evidence(page, 'drag-phone');
    });
    await expect(page.locator(CARRY)).toHaveCount(0);
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'half');
    await expect(page.locator('.site-pill__name')).toHaveText('Custom point');
    await expect(page.locator('.summary__name')).toHaveText('Custom point');
    await expect(page.locator('.summary__subtitle')).toHaveText(/^Near .+ · [\d.]+ km$/);
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-computed', 'true');
    await expect(page.locator(PIN)).toBeVisible();
    await expect(page.locator('.astro-phone-dock')).toHaveAttribute('data-status', 'away');
    await evidence(page, 'drop-phone-computed');
    release();
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-computed', 'false');
    await expect(page.locator('.site-pill .signal-dot')).toHaveAttribute('data-state', 'window');
    await evidence(page, 'drop-phone-horizons');
    await page.getByRole('button', { name: 'Astronaut on the Moon: bring it home' }).click();
    await expect(page.locator('.site-pill__name')).toHaveText('IM-2');
  });

  for (const path of ['./', './en-xa/'] as const) {
    test(`the dock sits beside the tab bar, or above its end when the bar needs the width (${path})`, async ({ page }) => {
      await open(page, path);
      const tabs = (await page.locator('.tab-bar').boundingBox())!;
      const dock = (await page.locator('.astro-phone-dock').boundingBox())!;
      expect(tabs.x).toBeGreaterThanOrEqual(0);
      const beside = tabs.x + tabs.width <= dock.x;
      const above = dock.y + dock.height <= tabs.y;
      expect(beside || above).toBe(true);
      // English fits on one row, as on the validated canvas.
      if (path === './') expect(beside).toBe(true);
      expect(dock.x + dock.width).toBeLessThanOrEqual(390);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});
