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
 * The globe's orientation references (VENT-50): the compass in the corner of the globe, whose fixed needle is north
 * and whose Earth mark follows the Earth, and a press on it brings the globe back to its opening framing; and the
 * graticule's labels, named in the interface's language and hidden behind the limb. The globe is only drawn on change,
 * so the checks that count frames read the WebGL draw calls of the page.
 *
 * Screenshots are saved only on request, into the directory ORIENTATION_SHOTS names:
 *
 *   ORIENTATION_SHOTS=/tmp/shots npm run e2e -- globe-orientation.spec.ts
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SITES, stubApi } from './api-stub';

// Under CI's parallel software-rendered pages the globe can take longer than the default 5 s to place its first
// markers; this wait is a start-up precondition, not an assertion (same bound as globe.spec.ts).
const GLOBE_START_MS = 20_000;
// The canvas's instant: the same Earth, Sun and sites in every run.
const CANVAS = new Date('2026-11-22T20:00:00Z');
const IM2 = '[data-site-id="im2-athena"]';
const SHOTS = process.env['ORIENTATION_SHOTS'];
const PRESS = 'Press to return the globe to its opening view.';
const GLOBE_NAME = 'The Moon, seen over its south pole';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const apart = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Counts the page's WebGL draw calls in `window.__draws`: one frame of the globe is several, an idle one none. */
async function countDraws(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counter = { draws: 0 };
    Reflect.set(window, '__draws', counter);
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const name of ['drawArrays', 'drawElements']) {
        const original = Reflect.get(proto, name) as (...args: unknown[]) => unknown;
        Reflect.set(proto, name, function (this: unknown, ...args: unknown[]) {
          counter.draws += 1;
          return Reflect.apply(original, this, args);
        });
      }
    }
  });
}

const draws = (page: Page): Promise<number> =>
  page.evaluate(() => (Reflect.get(window, '__draws') as { draws: number }).draws);

/** Waits until no frame has been drawn for 700 ms; the count then. */
async function idle(page: Page): Promise<number> {
  let last = -1;
  await expect
    .poll(
      async () => {
        const now = await draws(page);
        const still = now === last;
        last = now;
        await page.waitForTimeout(700);
        return still;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  return last;
}

/** Opens `path` at the canvas's instant, with the first-time pin hint `hint` or already seen. */
async function open(page: Page, path: string, { hint = false } = {}): Promise<void> {
  await page.clock.setFixedTime(CANVAS);
  await countDraws(page);
  await page.addInitScript((seen) => {
    localStorage.setItem('ventana.dataSource', 'computed');
    if (seen) localStorage.setItem('ventana.pinHint', 'seen');
  }, !hint);
  await stubApi(page);
  await page.goto(path);
}

const compassOf = (page: Page): Locator => page.getByRole('button', { name: /Press to return|Pulsa para devolver/ });

/** The centre of a marker's box, once the globe has stopped drawing. */
async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  await idle(page);
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const labelTexts = (page: Page): Promise<string[]> =>
  page.locator('.graticule-label:not([hidden])').evaluateAll((els) => els.map((el) => el.textContent ?? ''));

/** A mouse drag across the globe, `dx` and `dy` px from `from` (its middle by default). */
async function drag(page: Page, dx: number, dy: number, from?: { x: number; y: number }): Promise<void> {
  const view = (await page.getByRole('application', { name: GLOBE_NAME }).boundingBox())!;
  const { x, y } = from ?? { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Sets the root text size to 200 % as the page starts, as a browser's text zoom does. */
async function largeText(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.fontSize = '200%';
    });
  });
}

/**
 * The labels that touch what they must keep clear of, measured on the page: each marker's drawn dot (its ::after,
 * not the 44 px button around it), the selected site's ring, and the globe's view, which clips what leaves it.
 */
const labelClashes = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const box = (el: Element) => el.getBoundingClientRect();
    const centre = (el: Element) => ({ x: box(el).x + box(el).width / 2, y: box(el).y + box(el).height / 2 });
    const discs = [
      ...[...document.querySelectorAll('.globe-marker:not([hidden])')].map((el) => ({
        ...centre(el),
        r: Number.parseFloat(getComputedStyle(el, '::after').width) / 2,
        name: (el as HTMLElement).dataset['siteId'] ?? '',
      })),
      ...[...document.querySelectorAll('.globe-ring:not([hidden])')].map((el) => ({ ...centre(el), r: box(el).width / 2, name: 'ring' })),
    ];
    const view = box(document.querySelector('.globe-graticule')!.parentElement!);
    const hits: string[] = [];
    for (const label of document.querySelectorAll('.graticule-label:not([hidden])')) {
      const b = box(label);
      const text = label.textContent ?? '';
      if (b.left < view.left || b.top < view.top || b.right > view.right || b.bottom > view.bottom) hits.push(`${text} clipped`);
      for (const d of discs) {
        const dx = Math.max(b.x - d.x, 0, d.x - (b.x + b.width));
        const dy = Math.max(b.y - d.y, 0, d.y - (b.y + b.height));
        if (Math.hypot(dx, dy) < d.r) hits.push(`${text} on ${d.name}`);
      }
    }
    return hits;
  });

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the compass is a glass button in the globe\'s top right corner, clear of the hint and the Layers key', async ({ page }) => {
    await open(page, './', { hint: true });
    const compass = compassOf(page);
    await expect(compass).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.pin-hint')).toBeVisible();
    const box = (await compass.boundingBox())!;
    const globe = (await page.locator('section.globe').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    // Inside the globe's area, in its top right corner.
    expect(box.x + box.width).toBeLessThanOrEqual(globe.x + globe.width);
    expect(globe.x + globe.width - (box.x + box.width)).toBeLessThanOrEqual(24);
    expect(box.y - globe.y).toBeGreaterThanOrEqual(0);
    expect(box.y - globe.y).toBeLessThanOrEqual(24);
    expect(overlaps(box, (await page.locator('.globe .pin-hint').boundingBox())!)).toBe(false);
    expect(overlaps(box, (await page.locator('.globe .globe-layers').boundingBox())!)).toBe(false);
    await expect(compass.locator('.compass__n')).toHaveText('N');
    await shot(page, 'desktop-compass-and-hint');
  });

  test('its name says where the Earth is and what the press does, in the page\'s language', async ({ page }) => {
    await open(page, './');
    await expect(compassOf(page)).toHaveAccessibleName(/^Earth is [^.]+\. Press to return the globe to its opening view\.$/, {
      timeout: GLOBE_START_MS,
    });
    await open(page, './es/');
    await expect(compassOf(page)).toHaveAccessibleName(/^La Tierra [^.]+\. Pulsa para devolver el globo a su vista inicial\.$/, {
      timeout: GLOBE_START_MS,
    });
  });

  test('opens with the Earth up and to the left; turned half way round the Moon it is hollow, and the press brings it back', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './');
    const compass = compassOf(page);
    await expect(compass).toHaveAccessibleName(`Earth is toward the top left of the Moon. ${PRESS}`, { timeout: GLOBE_START_MS });
    await expect(compass).toHaveAttribute('data-far', 'false');
    await page.getByRole('application', { name: GLOBE_NAME }).focus();
    for (let turn = 0; turn < 18; turn += 1) await page.keyboard.press('ArrowRight');
    await expect(compass).toHaveAttribute('data-far', 'true');
    await expect(compass).toHaveAccessibleName(/^Earth is behind the Moon, toward the /);
    await compass.click();
    await expect(compass).toHaveAttribute('data-far', 'false');
    await expect(compass).toHaveAccessibleName(`Earth is toward the top left of the Moon. ${PRESS}`);
  });

  test('after a drag and a zoom, pressing the compass brings the globe back to its opening framing, and the globe rests', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/, { timeout: GLOBE_START_MS });
    const opening = await centreOf(page, IM2);
    await drag(page, 220, 70);
    await page.mouse.wheel(0, -250);
    const turned = await centreOf(page, IM2);
    expect(apart(turned, opening)).toBeGreaterThan(30);
    const before = await draws(page);
    await compassOf(page).click();
    await expect.poll(async () => apart(await centreOf(page, IM2), opening)).toBeLessThan(1.5);
    expect(await draws(page)).toBeGreaterThan(before);
    // Idle afterwards: the press drew its frames and nothing keeps the loop going.
    const rest = await idle(page);
    await page.waitForTimeout(1000);
    expect(await draws(page)).toBe(rest);
  });

  test('names the parallels and meridians the interface\'s way, and hides them behind the limb', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './');
    await expect(page.locator('.graticule-label:not([hidden])').first()).toBeVisible({ timeout: GLOBE_START_MS });
    // The eight curated sites near the pole fill the 85° S circle at the opening zoom: its label comes once the Moon is
    // closer (src/globe/graticule/place.ts), the others are there at once.
    expect(await labelTexts(page)).toEqual(expect.arrayContaining(['90° E', '45° W', '0°', '80° S', '70° S']));
    expect(await labelTexts(page)).not.toContain('85° S');
    await shot(page, 'desktop-graticule');
    await page.getByRole('application', { name: GLOBE_NAME }).focus();
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await expect.poll(() => labelTexts(page)).toContain('85° S');
    await shot(page, 'desktop-graticule-zoomed');
    await compassOf(page).click();
    await expect.poll(() => labelTexts(page)).not.toContain('85° S');
    // Looking down on the north, the whole southern grid is behind the limb.
    await page.getByRole('application', { name: GLOBE_NAME }).focus();
    for (let turn = 0; turn < 12; turn += 1) await page.keyboard.press('ArrowUp');
    await expect.poll(() => labelTexts(page)).toEqual([]);
    await expect(page.locator('.graticule-pole:not([hidden])')).toHaveCount(0);
    await compassOf(page).click();
    await expect.poll(async () => (await labelTexts(page)).length).toBeGreaterThan(3);
  });

  test('holds the labels until the sites are in, so no 85° S shows and then goes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await open(page, './');
    // Registered after the stub, so it answers the site list first: a slow answer, as on a busy runner.
    await page.route('**/api/v1/sites', async (route) => {
      await gate;
      await route.fulfill({ json: { sites: SITES } });
    });
    await page.reload();
    await expect(page.locator('.globe-viewport canvas')).toBeVisible({ timeout: GLOBE_START_MS });
    await idle(page);
    // The globe has drawn its frames with no site yet: the grid's lines are up, no label stands among no markers.
    expect(await labelTexts(page)).toEqual([]);
    release();
    await expect(page.locator('.graticule-label:not([hidden])').first()).toBeVisible({ timeout: GLOBE_START_MS });
    expect(await labelTexts(page)).not.toContain('85° S');
  });

  test('writes the western meridians with the Spanish O', async ({ page }) => {
    await open(page, './es/');
    await expect(page.locator('.graticule-label:not([hidden])').first()).toBeVisible({ timeout: GLOBE_START_MS });
    expect(await labelTexts(page)).toEqual(expect.arrayContaining(['70° S', '90° E', '90° O', '45° O']));
  });

  test('no label touches a site marker or the selected site\'s ring', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './');
    await expect(page.locator('.graticule-label:not([hidden])').first()).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.globe-ring')).toBeVisible();
    for (const zoomed of [false, true]) {
      if (zoomed) {
        await page.getByRole('application', { name: GLOBE_NAME }).focus();
        await page.keyboard.press('+');
        await page.keyboard.press('+');
      }
      await idle(page);
      const touching = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        // The dot of a marker is 12 px at most; the ring is 30 px with a 4 px halo: their centres, with those radii.
        const discs = [
          ...[...document.querySelectorAll('.globe-marker:not([hidden])')].map((el) => ({ el, r: 7 })),
          ...[...document.querySelectorAll('.globe-ring:not([hidden])')].map((el) => ({ el, r: 19 })),
        ].map(({ el, r }) => ({ x: box(el).x + box(el).width / 2, y: box(el).y + box(el).height / 2, r }));
        const hits: string[] = [];
        for (const label of document.querySelectorAll('.graticule-label:not([hidden])')) {
          const b = box(label);
          for (const d of discs) {
            const dx = Math.max(b.x - d.x, 0, d.x - (b.x + b.width));
            const dy = Math.max(b.y - d.y, 0, d.y - (b.y + b.height));
            if (Math.hypot(dx, dy) < d.r) hits.push(label.textContent ?? '');
          }
        }
        return hits;
      });
      expect(touching).toEqual([]);
    }
  });

  test('no label touches a saved site\'s silver pin (VENT-52)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Twenty saved sites on the 70° S and 80° S parallels, where those parallels' labels stand, leaving them room.
    const sites = [-70, -80].flatMap((lat, row) =>
      Array.from({ length: 10 }, (_, i) => {
        const lonEast = -180 + i * 36 + row * 7;
        return { id: `@${lat.toFixed(2)},${lonEast.toFixed(2)}`, name: `Spot ${row}-${i}`, lat, lonEast, savedAt: 1 + row * 10 + i };
      }));
    await page.addInitScript((kept) => localStorage.setItem('ventana.savedSites', kept), JSON.stringify({ v: 1, sites }));
    await open(page, './');
    await expect(page.locator('.graticule-label:not([hidden])').first()).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.saved-marker:not([hidden])').first()).toBeVisible();
    for (const zoomed of [false, true]) {
      if (zoomed) {
        await page.getByRole('application', { name: GLOBE_NAME }).focus();
        await page.keyboard.press('+');
      }
      await idle(page);
      const touching = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        // The pin's drawn ring is 14 px (saved.css `.saved-marker::before`), inside its 44 px button.
        const pins = [...document.querySelectorAll('.saved-marker:not([hidden])')].map((el) => ({
          x: box(el).x + box(el).width / 2,
          y: box(el).y + box(el).height / 2,
          r: Number.parseFloat(getComputedStyle(el, '::before').width) / 2,
        }));
        const hits: string[] = [];
        for (const label of document.querySelectorAll('.graticule-label:not([hidden])')) {
          const b = box(label);
          for (const d of pins) {
            const dx = Math.max(b.x - d.x, 0, d.x - (b.x + b.width));
            const dy = Math.max(b.y - d.y, 0, d.y - (b.y + b.height));
            if (Math.hypot(dx, dy) < d.r) hits.push(label.textContent ?? '');
          }
        }
        return hits;
      });
      expect(touching).toEqual([]);
      expect(await page.locator('.graticule-label:not([hidden])').count()).toBeGreaterThan(0);
    }
  });

  test('at 200 % text the labels measure their box: none touches a marker\'s dot or the ring, none leaves the view (VENT-51)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await largeText(page);
    await open(page, './');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/, { timeout: GLOBE_START_MS });
    const app = page.getByRole('application', { name: GLOBE_NAME });
    for (const step of ['opening', '+', '+', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
      if (step !== 'opening') {
        await app.focus();
        await page.keyboard.press(step);
      }
      await idle(page);
      expect(await labelClashes(page), step).toEqual([]);
    }
    await shot(page, 'desktop-graticule-200-text');
  });

  test('zoomed in all the way, the Moon is wider than the view: every label stays whole inside it (VENT-51)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './');
    await expect(page.locator('.graticule-label:not([hidden])').first()).toBeVisible({ timeout: GLOBE_START_MS });
    await page.getByRole('application', { name: GLOBE_NAME }).focus();
    for (let press = 0; press < 9; press += 1) await page.keyboard.press('+');
    await idle(page);
    expect(await labelClashes(page)).toEqual([]);
    expect((await labelTexts(page)).length).toBeGreaterThan(0);
    // A zoom does not turn the Moon: the Earth is where it was, not behind it.
    await expect(compassOf(page)).toHaveAttribute('data-far', 'false');
    await shot(page, 'desktop-graticule-zoomed-in');
  });

  test('the grid lets the globe be dragged and the markers be pressed through it', async ({ page }) => {
    await open(page, './');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/, { timeout: GLOBE_START_MS });
    const pointer = await page.locator('.graticule-label:not([hidden])').first().evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointer).toBe('none');
    await expect(page.locator('.globe-graticule')).toHaveAttribute('aria-hidden', 'true');
    // Under the markers and the compass in paint order.
    const order = await page.locator('.globe-viewport').evaluate((host) => [...host.children].map((el) => el.className));
    expect(order.indexOf('globe-graticule')).toBeLessThan(order.indexOf('globe-markers'));
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the compass sits under the glass top bar, and under the first-time hint while it shows', async ({ page }) => {
    await open(page, './', { hint: true });
    const compass = compassOf(page);
    await expect(compass).toBeVisible({ timeout: GLOBE_START_MS });
    await expect(page.locator('.pin-hint')).toBeVisible();
    const bar = (await page.locator('.phone-bar').boundingBox())!;
    await expect.poll(async () => (await compass.boundingBox())!.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    const hint = (await page.locator('.pin-hint').boundingBox())!;
    const box = (await compass.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(overlaps(box, hint)).toBe(false);
    expect(box.y).toBeGreaterThanOrEqual(hint.y + hint.height);
    const globe = (await page.locator('section.globe').boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(globe.x + globe.width);
    await shot(page, 'phone-compass-under-hint');
    // The hint goes: the compass moves up under the bar.
    await page.getByRole('button', { name: 'Dismiss the hint' }).click();
    await expect.poll(async () => Math.round((await compass.boundingBox())!.y)).toBe(Math.round(bar.y + bar.height + 8));
    await shot(page, 'phone-compass-and-graticule');
  });

  test('at 200 % text the compass stands only in the free band: out of the way while the sheet covers the globe, pressable above it at peek (VENT-51)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await largeText(page);
    await open(page, './');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/, { timeout: GLOBE_START_MS });
    const sheet = page.locator('.sheet');
    const rests = async (): Promise<void> => {
      await expect.poll(() => sheet.evaluate((el) => el.hasAttribute('data-moving')), { timeout: 30_000 }).toBe(false);
    };
    /** Whether the compass, where it stands, is the element a finger at its centre reaches, whole above the sheet. */
    const reachable = (): Promise<boolean> =>
      page.evaluate(() => {
        const button = document.querySelector('button.compass')!;
        const b = button.getBoundingClientRect();
        const edge = document.querySelector('.sheet')!.getBoundingClientRect().top;
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return b.bottom <= edge && hit !== null && button.contains(hit);
      });
    await rests();
    // The half sheet rises to the full detent at this text size (VENT-44): no band is left for the globe.
    await expect(compassOf(page)).toBeHidden();
    await shot(page, 'phone-200-text-half');
    await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
    await page.getByRole('button', { name: /^Sheet full height/ }).press('Enter');
    await rests();
    await expect(compassOf(page)).toBeVisible();
    expect(await reachable()).toBe(true);
    await shot(page, 'phone-200-text-peek');
    // Playwright taps only an element that receives the touch at its centre.
    await compassOf(page).tap();
  });

  test('after a drag, a press on the compass frames the selected site in the free band above the sheet again', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, './');
    await expect(page.locator(IM2)).toHaveAttribute('style', /translate3d/, { timeout: GLOBE_START_MS });
    const opening = await centreOf(page, IM2);
    // From the free band above the sheet: the sheet at half covers the middle of the screen.
    await drag(page, 120, 90, { x: 195, y: 200 });
    const turned = await centreOf(page, IM2);
    expect(apart(turned, opening)).toBeGreaterThan(30);
    await compassOf(page).tap();
    await expect.poll(async () => apart(await centreOf(page, IM2), opening)).toBeLessThan(1.5);
  });
});
