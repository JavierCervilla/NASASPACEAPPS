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
 * The selected site's callout on the globe (VENT-29, validated canvases «Globe · site callout B, image card» for
 * desktop and «… A, compact» for phones), at the canvas's date: IM-2 answers real JPL Horizons hours for November
 * 2026 (api-stub.ts), so its state and countdowns read as the site card's.
 */
import { expect, test, type Page } from '@playwright/test';
import { SITES, stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const IM1 = '[data-site-id="im1-odysseus"]';
const IM2 = '[data-site-id="im2-athena"]';
const callout = (page: Page) => page.locator('.globe-callout');
const part = (page: Page, name: string) => callout(page).locator(`.globe-callout__${name}`);
/** A row's wording for one layout: `wide` on a desktop, `narrow` on a phone. */
const wording = (page: Page, name: string, layout: 'wide' | 'narrow') => part(page, name).locator(`.globe-callout__${layout}`);

async function open(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto('./');
  await expect(callout(page)).toHaveAttribute('data-state', 'window');
}

/** The centre of a marker once two reads 150 ms apart agree: the globe has stopped turning. */
async function settledCentre(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const read = () => page.locator(selector).evaluate((el) => (el as HTMLElement).style.transform);
  let last = await read();
  await expect
    .poll(async () => {
      await page.waitForTimeout(150);
      const now = await read();
      const still = now === last && now !== '';
      last = now;
      return still;
    })
    .toBe(true);
  const box = await page.locator(selector).boundingBox();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shows the image, the site, its point, the state and the two countdowns for IM-2', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await open(page);
    const group = page.getByRole('group', { name: 'Mons Mouton (IM-2 Athena)' });
    await expect(group).toBeVisible();
    const image = group.getByRole('img', { name: 'Mons Mouton from orbit, LOLA relief' });
    await expect(image).toHaveAttribute('src', '/thumbs/im2-athena.jpg');
    await expect(image).toHaveAttribute('decoding', 'async');
    // A 1x screen picks the 320 px file from the srcset.
    await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).currentSrc)).toMatch(/\/thumbs\/im2-athena\.jpg$/);
    expect((await image.boundingBox())?.height).toBe(150);
    await expect(part(page, 'badge')).toHaveText('Landing window now');
    await expect(part(page, 'caption')).toHaveText('LOLA · 30 km');
    await expect(wording(page, 'mission', 'wide')).toHaveText('IM-2 Athena · landed 6 Mar 2025');
    await expect(wording(page, 'mission', 'narrow')).toBeHidden();
    await expect(wording(page, 'place', 'wide')).toHaveText('Mons Mouton');
    await expect(wording(page, 'place', 'narrow')).toBeHidden();
    await expect(wording(page, 'point', 'wide')).toHaveText('84.79° S, 29.20° E · exact touchdown');
    await expect(wording(page, 'point', 'narrow')).toBeHidden();
    await expect(part(page, 'tiles')).toHaveText('Sunset in7 d 1 hEarthset in7 d 10 h');
    // Only the selected site's thumbnail is fetched.
    expect(requested.filter((url) => url.includes('/thumbs/'))).toEqual([expect.stringMatching(/\/thumbs\/im2-athena\.jpg$/)]);
  });

  test('follows the slider: the state and the countdowns move with the instant', async ({ page }) => {
    await open(page);
    await page.getByRole('slider').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(part(page, 'tiles')).toHaveText('Sunset in7 dEarthset in7 d 9 h');
    // 9 November, 08:00: neither the Sun nor the Earth at IM-2.
    await page.getByRole('slider').first().fill('200');
    await expect(callout(page)).toHaveAttribute('data-state', 'none');
    await expect(part(page, 'badge')).toHaveText('Neither');
  });

  test('hides when its marker turns behind the limb, and comes back with it', async ({ page }) => {
    await open(page);
    await expect(callout(page)).toBeVisible();
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowUp');
    await expect(page.locator(IM2)).toBeHidden();
    await expect(callout(page)).toBeHidden();
    await expect(page.locator('.globe-callout-leader')).toBeHidden();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowDown');
    await expect(callout(page)).toBeVisible();
  });

  test('takes no clicks: IM-1 and a marker under the card are still picked', async ({ page }) => {
    await open(page);
    expect(await callout(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    const im1 = await settledCentre(page, IM1);
    await page.mouse.click(im1.x, im1.y);
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
    await expect(callout(page)).toHaveAttribute('aria-label', 'Malapert A region (IM-1 Odysseus)');
    // Back on IM-2, zoomed in until a marker sits under its card: the click goes through the card to it.
    await page.getByRole('button', { name: /^Mons Mouton \(IM-2 Athena\)/ }).press('Enter');
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 4; press += 1) await page.keyboard.press('+');
    await settledCentre(page, IM2);
    const under = await page.evaluate(() => {
      const card = document.querySelector('.globe-callout')!.getBoundingClientRect();
      const inside = [...document.querySelectorAll<HTMLElement>('.globe-marker')].filter((el) => {
        const r = el.getBoundingClientRect();
        const [x, y] = [r.x + r.width / 2, r.y + r.height / 2];
        return !el.hidden && x > card.left && x < card.right && y > card.top && y < card.bottom;
      });
      const first = inside[0]!.getBoundingClientRect();
      return { id: inside[0]!.dataset['siteId'], x: first.x + first.width / 2, y: first.y + first.height / 2 };
    });
    expect(await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement).dataset['siteId'], under)).toBe(under.id);
    await page.mouse.click(under.x, under.y);
    await expect(page.locator(`[data-site-id="${under.id}"]`)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a site north of 80° S shows the card without the image header', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(callout(page)).toHaveAttribute('aria-label', 'Mare Tranquillitatis (Tranquility Base) (Apollo 11)');
    await expect(callout(page)).toHaveAttribute('data-image', 'none');
    await expect(part(page, 'media')).toBeHidden();
    await expect(part(page, 'pill')).toBeVisible();
  });
});

test.describe('desktop, 1440x900, a long point', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('wraps the point only before its precision, never inside the coordinates', async ({ page }) => {
    await open(page);
    const point = wording(page, 'point', 'wide');
    const lines = await point.evaluate((el) => {
      el.textContent = '89.67°\u00a0S,\u00a0129.78°\u00a0E\u00a0· approximate zone, not a landing point';
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = el.textContent;
      // The text of each line box, from the range of every character.
      const tops = new Map<number, string>();
      for (let i = 0; i < text.length; i += 1) {
        range.setStart(el.firstChild!, i);
        range.setEnd(el.firstChild!, i + 1);
        const top = Math.round(range.getBoundingClientRect().top);
        tops.set(top, (tops.get(top) ?? '') + text[i]);
      }
      return [...tops.values()].map((line) => line.replaceAll('\u00a0', ' ').trim());
    });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]!.startsWith('89.67° S, 129.78° E ·')).toBe(true);
  });
});

/** The rows of the phone's compact card, each one line box and not clipped. */
async function phoneRows(page: Page): Promise<{ name: string; lines: number; clipped: boolean }[]> {
  return callout(page).evaluate((card) =>
    ['mission', 'place', 'point', 'pill'].map((name) => {
      const row = card.querySelector<HTMLElement>(`.globe-callout__${name}`)!;
      const range = document.createRange();
      range.selectNodeContents(row);
      const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
      return { name, lines: tops.size, clipped: row.scrollWidth > row.clientWidth };
    }),
  );
}

/** The south pole's sites, as the phone's picker lists them by default. */
const SOUTH_POLE = SITES.filter((site) => site.group === 'south_pole');

for (const [width, height] of [[390, 844], [360, 780]] as const) {
  test.describe(`phone, ${width}x${height}, one line per row`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('the compact callout shows each of its text rows on one line, IM-2 in full', async ({ page }) => {
      await open(page);
      await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
      await expect(callout(page)).toBeVisible();
      await expect(wording(page, 'mission', 'narrow')).toHaveText('IM-2 · 6 Mar 2025');
      await expect(wording(page, 'mission', 'wide')).toBeHidden();
      await expect(wording(page, 'place', 'narrow')).toHaveText('Mons Mouton');
      await expect(wording(page, 'place', 'wide')).toBeHidden();
      await expect(wording(page, 'point', 'narrow')).toHaveText('84.79° S · 29.20° E');
      await expect(wording(page, 'point', 'wide')).toBeHidden();
      for (const row of await phoneRows(page)) {
        expect(row, row.name).toMatchObject({ lines: 1, clipped: false });
      }
    });

    test('every south pole site fits each row whole: no ellipsis ever triggers', async ({ page }) => {
      await open(page);
      const tabs = page.getByRole('navigation', { name: 'Views' });
      const rows = page.getByRole('list', { name: 'Sites' }).getByRole('button');
      await tabs.getByRole('button', { name: 'Sites' }).click();
      await expect(rows).toHaveCount(SOUTH_POLE.length);
      for (const [i, { name }] of SOUTH_POLE.entries()) {
        await tabs.getByRole('button', { name: 'Sites' }).click();
        await rows.nth(i).click();
        // The picker lists the sites in the list's order; the accessible name keeps the full name.
        await expect(callout(page)).toHaveAttribute('aria-label', name);
        await expect(part(page, 'pill')).not.toHaveText('');
        for (const row of await phoneRows(page)) {
          expect(row, `${name}: ${row.name}`).toMatchObject({ lines: 1, clipped: false });
        }
      }
    });
  });
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('with the sheet closed the compact callout shows the thumbnail, the site and the state with its time left', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
    await expect(callout(page)).toBeVisible();
    const image = callout(page).getByRole('img', { name: 'Mons Mouton from orbit, LOLA relief' });
    const box = await image.boundingBox();
    expect([box?.width, box?.height]).toEqual([84, 84]);
    await expect(part(page, 'pill')).toHaveText('Landing window · 7 d 1 h left');
    await expect(part(page, 'tiles')).toBeHidden();
    await expect(part(page, 'badge')).toBeHidden();
    // Inside the screen, clear of the top bar and the tab bar.
    const card = (await callout(page).boundingBox())!;
    const bar = (await page.locator('.phone-bar').boundingBox())!;
    const tabs = (await page.locator('.tab-bar').boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(390);
    expect(card.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(card.y + card.height).toBeLessThanOrEqual(tabs.y);
  });
});

/**
 * VENT-31 (Brave on Android): with IM-1 selected and the globe zoomed in, a slow drag made the card jump between two
 * sides, or blink, frame after frame. Every frame's side and visibility, as the card states them, through a slow drag.
 */
async function dragStates(page: Page, step: { x: number; y: number }): Promise<string[]> {
  await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.globe-callout')!;
    const states: string[] = [];
    (window as unknown as { calloutStates: string[] }).calloutStates = states;
    const sample = (): void => {
      const now = `${card.dataset['shown']}:${card.dataset['side']}`;
      if (states.at(-1) !== now) states.push(now);
      requestAnimationFrame(sample);
    };
    sample();
  });
  let [x, y] = [195, 300];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let move = 0; move < 120; move += 1) {
    [x, y] = [x + step.x, y + step.y];
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
  return page.evaluate(() => (window as unknown as { calloutStates: string[] }).calloutStates);
}

test.describe('phone, 390x844, IM-1 zoomed in', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  for (const [name, step] of [['sideways', { x: 3, y: 0 }], ['downwards', { x: 0, y: 3 }]] as const) {
    test(`a slow drag ${name} never flips the card back and forth`, async ({ page }) => {
      await open(page);
      const tabs = page.getByRole('navigation', { name: 'Views' });
      await tabs.getByRole('button', { name: 'Sites' }).click();
      await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /IM-1/ }).first().click();
      await tabs.getByRole('button', { name: 'Globe' }).click();
      await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
      await expect(callout(page)).toHaveAttribute('aria-label', 'Malapert A region (IM-1 Odysseus)');
      await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
      for (let press = 0; press < 9; press += 1) await page.keyboard.press('+');
      await settledCentre(page, IM1);
      const states = await dragStates(page, step);
      // A→B→A: the card went somewhere and came straight back, the flicker the phone showed.
      const flips = states.filter((state, i) => i >= 2 && state === states[i - 2]);
      expect(flips, states.join(' → ')).toEqual([]);
      expect(states.length, states.join(' → ')).toBeLessThanOrEqual(4);
    });
  }
});

/** The area two page boxes share, in px². */
function shared(a: { x: number; y: number; width: number; height: number }, b: typeof a): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/** How much of `selector` the shown callout covers, in px²; 0 while it is hidden. */
async function coveredBy(page: Page, selector: string): Promise<number> {
  if ((await callout(page).getAttribute('data-shown')) !== 'true') return 0;
  const [card, other] = [await callout(page).boundingBox(), await page.locator(selector).boundingBox()];
  return card && other ? shared(card, other) : 0;
}

/** The globe turned and zoomed through the moves that once slid the card onto the Layers key at 1280x720. */
const SWEEP = [
  ...Array<string>(6).fill('ArrowLeft'),
  ...Array<string>(4).fill('+'),
  ...Array<string>(10).fill('ArrowRight'),
  ...Array<string>(5).fill('ArrowUp'),
  ...Array<string>(8).fill('ArrowDown'),
  ...Array<string>(6).fill('ArrowRight'),
];

test.describe('desktop, 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('never covers the Layers key as the globe turns, even when the card has to slide down', async ({ page }) => {
    await open(page);
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (const [step, key] of SWEEP.entries()) {
      await page.keyboard.press(key);
      await settledCentre(page, IM2).catch(() => undefined);
      expect(await coveredBy(page, '.globe-layers'), `after move ${step} (${key})`).toBe(0);
    }
  });

  test('the selected marker takes its state colour and a halo of it, and keeps its clicks', async ({ page }) => {
    await open(page);
    const dot = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el, '::after').backgroundColor);
    await expect.poll(() => dot(IM2)).toBe('rgb(61, 220, 132)');
    // The halo: the same colour at 28 %, 5 px around the dot.
    expect(await page.locator(IM2).evaluate((el) => getComputedStyle(el, '::after').boxShadow)).toContain('0.862745 0.517647 / 0.28) 0px 0px 0px 5px');
    await page.getByRole('slider').first().fill('200');
    await expect(callout(page)).toHaveAttribute('data-state', 'none');
    await expect.poll(() => dot(IM2)).toBe('rgb(58, 60, 68)');
    const im1 = await settledCentre(page, IM1);
    await page.mouse.click(im1.x, im1.y);
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
    // The old marker goes back to plain white.
    await expect.poll(() => dot(IM2)).toBe('rgb(242, 242, 244)');
  });

  test('at 200 % text the card drops its image and countdowns, stays inside the globe, and clips nothing', async ({ page }) => {
    await open(page);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await expect(part(page, 'media')).toBeHidden();
    await expect(part(page, 'tiles')).toBeHidden();
    await expect(part(page, 'pill')).toHaveText('Landing window · 7 d 1 h left');
    await settledCentre(page, IM2);
    await expect(callout(page)).toBeVisible();
    expect(await coveredBy(page, '.globe-layers')).toBe(0);
    const host = (await page.locator('.globe-markers').boundingBox())!;
    const card = (await callout(page).boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(host.x);
    expect(card.y).toBeGreaterThanOrEqual(host.y);
    expect(card.x + card.width).toBeLessThanOrEqual(host.x + host.width);
    expect(card.y + card.height).toBeLessThanOrEqual(host.y + host.height);
    expect(card.width).toBeLessThanOrEqual(host.width * 0.62 + 1);
    const clipped = await callout(page).evaluate((el) =>
      [el as HTMLElement, ...el.querySelectorAll<HTMLElement>('*')]
        .filter((node) => node.offsetParent !== null || node === el)
        .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)
        .map((node) => node.className),
    );
    expect(clipped).toEqual([]);
  });

  test('the longest mission line wraps to at most two lines and keeps its date', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('blue moon');
    await dialog.getByRole('button', { name: /^Shackleton connecting ridge/ }).click();
    const mission = wording(page, 'mission', 'wide');
    await expect(mission).toHaveText('Blue Moon MK1 Pathfinder · planned · NET Q1 2027 (launch)');
    const row = part(page, 'mission');
    const lines = await mission.evaluate((el) => new Set([...el.getClientRects()].map((r) => Math.round(r.top))).size);
    expect(lines).toBeGreaterThan(0);
    expect(lines).toBeLessThanOrEqual(2);
    expect(await row.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });
});

test.describe('desktop, 1440x900, the month still loading or failed', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function openWith(page: Page, options: Parameters<typeof stubApi>[1]): Promise<void> {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.clock.setFixedTime(NOW);
    await stubApi(page, options);
    await page.goto('./');
  }

  test('while the hours are on their way the state and the countdowns are skeletons', async ({ page }) => {
    let release = (): void => undefined;
    await openWith(page, { hold: new Promise<void>((resolve) => (release = resolve)) });
    await expect(callout(page)).toHaveAttribute('data-hours', 'pending');
    await expect(part(page, 'badge')).toBeVisible();
    await expect(part(page, 'badge')).toHaveText('');
    await expect(part(page, 'tile').first()).toBeVisible();
    const skeleton = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--card-skeleton').trim());
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(skeleton.slice(i, i + 2), 16));
    expect(await part(page, 'badge').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(`rgb(${r}, ${g}, ${b})`);
    release();
    await expect(callout(page)).toHaveAttribute('data-hours', 'ready');
    await expect(part(page, 'badge')).toHaveText('Landing window now');
  });

  test('when the API fails the card says «Data unavailable», neutral, without countdowns', async ({ page }) => {
    await openWith(page, { status: 503 });
    await expect(callout(page)).toHaveAttribute('data-hours', 'error');
    await expect(part(page, 'badge')).toHaveText('Data unavailable');
    await expect(part(page, 'tiles')).toBeHidden();
  });

  test('a new site hides the old image until its own has loaded', async ({ page }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/thumbs/im1-odysseus*', async (route) => {
      await held;
      await route.fallback();
    });
    await open(page);
    await expect(callout(page)).toHaveAttribute('data-image-ready', 'true');
    await page.getByRole('button', { name: /^Malapert A region \(IM-1 Odysseus\)/ }).press('Enter');
    await expect(callout(page)).toHaveAttribute('aria-label', 'Malapert A region (IM-1 Odysseus)');
    await expect(callout(page)).toHaveAttribute('data-image-ready', 'false');
    await expect(part(page, 'image')).toHaveCSS('visibility', 'hidden');
    release();
    await expect(callout(page)).toHaveAttribute('data-image-ready', 'true');
    await expect(part(page, 'image')).toHaveCSS('visibility', 'visible');
  });
});

// The file a 2x screen needs for the drawn width: 264 px x 2 on a desktop, 84 px x 2 on a phone.
for (const [name, viewport, isMobile, file, width] of [
  ['desktop', { width: 1440, height: 900 }, false, 'im2-athena@2x.jpg', 640],
  ['phone', { width: 390, height: 844 }, true, 'im2-athena.jpg', 320],
] as const) {
  test.describe(`${name} at 2x`, () => {
    test.use({ viewport, deviceScaleFactor: 2, isMobile, hasTouch: isMobile });

    test(`fetches one thumbnail, ${file}, the one its drawn size needs`, async ({ page }) => {
      const requested: string[] = [];
      page.on('request', (request) => requested.push(request.url()));
      await open(page);
      if (isMobile) await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
      const image = part(page, 'image');
      await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).currentSrc)).toMatch(new RegExp(`/thumbs/${file.replace('.', '\\.')}$`));
      expect(await image.evaluate((img) => (img as HTMLImageElement).naturalWidth * devicePixelRatio)).toBeGreaterThanOrEqual(width === 640 ? 528 : 168);
      await page.waitForLoadState('networkidle');
      expect(requested.filter((url) => url.includes('/thumbs/'))).toEqual([expect.stringMatching(new RegExp(`/thumbs/${file.replace('.', '\\.')}$`))]);
    });
  });
}

test.describe('phone, 390x844, behind the tab bar', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the callout never covers the top bar or the tab bar, and hides while IM-2 is under the tab bar', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    let underTabs = 0;
    for (const [step, key] of [...SWEEP.slice(0, 20), 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'].entries()) {
      await page.keyboard.press(key);
      const marker = await settledCentre(page, IM2).catch(() => null);
      expect(await coveredBy(page, '.tab-bar'), `tab bar, move ${step}`).toBe(0);
      expect(await coveredBy(page, '.phone-bar'), `top bar, move ${step}`).toBe(0);
      const tabs = (await page.locator('.tab-bar').boundingBox())!;
      const inside = marker && shared({ ...marker, width: 1, height: 1 }, tabs) > 0;
      if (inside) {
        underTabs += 1;
        await expect(callout(page)).toBeHidden();
      }
    }
    // The walk does take IM-2 under the tab bar.
    expect(underTabs).toBeGreaterThan(0);
  });
});
