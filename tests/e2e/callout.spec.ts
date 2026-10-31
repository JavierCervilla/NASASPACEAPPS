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
const ring = (page: Page) => page.locator('.globe-ring');
/** The sheet's top edge, in px from the top of the viewport. */
const sheetTop = (page: Page) => page.locator('.sheet').evaluate((el) => Math.round(el.getBoundingClientRect().top));
const HALF_TOP = 844 - 344;
/**
 * Waits until the card stands 12 px above the tab bar: the sheet reports its edge on the frame after it closes (the
 * `inert` attribute comes first), and the card docks on that report.
 */
async function dockedAboveTabs(page: Page): Promise<void> {
  const gap = () =>
    page.evaluate(() => {
      const card = document.querySelector('.globe-callout')!.getBoundingClientRect();
      return Math.round(document.querySelector('.tab-bar')!.getBoundingClientRect().top - card.bottom);
    });
  await expect.poll(gap).toBe(12);
}
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

  test('stays while its marker turns behind the limb, where the ring hides, and both come back with it', async ({ page }) => {
    await open(page);
    await expect(ring(page)).toBeVisible();
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowUp');
    await expect(page.locator(IM2)).toBeHidden();
    await expect(ring(page)).toBeHidden();
    await expect(callout(page)).toBeVisible();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowDown');
    await expect(ring(page)).toBeVisible();
  });

  test('docks on the Layers key\'s left edge, 14 px above it, and the selected marker wears the ring', async ({ page }) => {
    await open(page);
    const card = (await callout(page).boundingBox())!;
    const layers = (await page.locator('section.globe .globe-layers').boundingBox())!;
    expect(card.x).toBe(layers.x);
    expect(card.x).toBe(44);
    expect(Math.abs(card.y + card.height - (layers.y - 14))).toBeLessThanOrEqual(1);
    const marker = await settledCentre(page, IM2);
    const box = (await ring(page).boundingBox())!;
    // The ring is centred on the marker.
    expect(Math.abs(box.x + box.width / 2 - marker.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - marker.y)).toBeLessThanOrEqual(1);
    // Under reduced motion the ring is still: no pulse.
    expect(await ring(page).evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('none');
  });

  test('pulses the ring for 2.4 s, scaling out and fading, with motion allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await page.goto('./');
    await expect(callout(page)).toHaveAttribute('data-state', 'window');
    const style = await ring(page).evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      return [after.animationName, after.animationDuration, after.animationIterationCount, after.borderTopColor];
    });
    expect(style).toEqual(['globe-ring-pulse', '2.4s', 'infinite', 'rgb(61, 220, 132)']);
  });

  test('stays still while the globe is dragged', async ({ page }) => {
    await open(page);
    const before = await callout(page).boundingBox();
    const globe = (await page.locator('.globe-viewport').boundingBox())!;
    const [x, y] = [globe.x + globe.width / 2, globe.y + globe.height / 3];
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let move = 1; move <= 20; move += 1) await page.mouse.move(x + move * 8, y + move * 3);
    await page.mouse.up();
    await settledCentre(page, IM2).catch(() => undefined);
    expect(await callout(page).boundingBox()).toEqual(before);
  });

  test('takes no clicks: IM-1 is still picked, and the card lets the pointer through', async ({ page }) => {
    await open(page);
    expect(await callout(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    const im1 = await settledCentre(page, IM1);
    await page.mouse.click(im1.x, im1.y);
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
    await expect(callout(page)).toHaveAttribute('aria-label', 'Malapert A region (IM-1 Odysseus)');
    // The point under the card's centre belongs to what is beneath it, never to the card.
    const card = (await callout(page).boundingBox())!;
    const centre = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
    expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.globe-callout')), centre)).toBe(false);
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
    await dockedAboveTabs(page);
    const image = callout(page).getByRole('img', { name: 'Mons Mouton from orbit, LOLA relief' });
    const box = await image.boundingBox();
    expect([box?.width, box?.height]).toEqual([84, 84]);
    await expect(part(page, 'pill')).toHaveText('Landing window · 7 d 1 h left');
    await expect(part(page, 'tiles')).toBeHidden();
    await expect(part(page, 'badge')).toBeHidden();
    // Docked 12 px off the left edge and 12 px above the tab bar.
    const card = (await callout(page).boundingBox())!;
    const tabs = (await page.locator('.tab-bar').boundingBox())!;
    expect(card.x).toBe(12);
    expect(Math.abs(card.y + card.height - (tabs.y - 12))).toBeLessThanOrEqual(1);
  });

  test('at half height the card stands 12 px above the sheet\'s edge, and hides at full height', async ({ page }) => {
    await open(page);
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
    await expect(callout(page)).toBeVisible();
    const card = (await callout(page).boundingBox())!;
    expect(card.x).toBe(12);
    expect(Math.abs(card.y + card.height - (HALF_TOP - 12))).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
    await expect.poll(() => sheetTop(page)).toBe(96);
    await expect(callout(page)).toBeHidden();
    await expect(callout(page)).toHaveAttribute('data-shown', 'false');
  });

  test('follows the sheet\'s edge through a drag, frame by frame', async ({ page }) => {
    await open(page);
    await expect.poll(() => sheetTop(page)).toBe(HALF_TOP);
    await page.mouse.move(195, HALF_TOP + 40);
    await page.mouse.down();
    await page.mouse.move(195, HALF_TOP + 120, { steps: 6 });
    const gap = await page.evaluate(() => {
      const card = document.querySelector('.globe-callout')!.getBoundingClientRect();
      return document.querySelector('.sheet')!.getBoundingClientRect().top - card.bottom;
    });
    await page.mouse.up();
    expect(Math.abs(gap - 12)).toBeLessThanOrEqual(1);
  });

  test('a drag on the globe never moves the card', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
    await expect(callout(page)).toBeVisible();
    await dockedAboveTabs(page);
    const before = await callout(page).boundingBox();
    await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('.globe-callout')!;
      const seen = new Set<string>();
      (window as unknown as { cardStates: Set<string> }).cardStates = seen;
      const sample = (): void => {
        const r = card.getBoundingClientRect();
        seen.add(`${card.dataset['shown']}:${r.x},${r.y},${r.width},${r.height}`);
        requestAnimationFrame(sample);
      };
      sample();
    });
    let [x, y] = [195, 300];
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let move = 0; move < 60; move += 1) {
      [x, y] = [x + 3, y + 2];
      await page.mouse.move(x, y);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForTimeout(200);
    const states = await page.evaluate(() => [...(window as unknown as { cardStates: Set<string> }).cardStates]);
    expect(states).toHaveLength(1);
    expect(await callout(page).boundingBox()).toEqual(before);
  });
});

test.describe('phone, 390x664', () => {
  test.use({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });

  test('at half height on a short screen the card stays clear of the top bar', async ({ page }) => {
    await open(page);
    await expect.poll(() => sheetTop(page)).toBe(664 - 344);
    await expect(callout(page)).toBeVisible();
    const card = (await callout(page).boundingBox())!;
    const bar = (await page.locator('.phone-bar').boundingBox())!;
    expect(card.y).toBeGreaterThanOrEqual(bar.y + bar.height + 12);
    expect(Math.abs(card.y + card.height - (664 - 344 - 12))).toBeLessThanOrEqual(1);
  });
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

/** The globe turned and zoomed through the moves that once slid the riding card onto the Layers key at 1280x720. */
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

  test('never covers the Layers key as the globe turns', async ({ page }) => {
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

  test('at 200 % text the card drops its image and countdowns and clips nothing', async ({ page }) => {
    await open(page);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await expect(part(page, 'media')).toBeHidden();
    await expect(part(page, 'tiles')).toBeHidden();
    await expect(part(page, 'pill')).toHaveText('Landing window · 7 d 1 h left');
    await settledCentre(page, IM2);
    // No room above the Layers key at this size: the card hides (QA F2, the test at the end of this file).
    expect(await coveredBy(page, '.globe-layers')).toBe(0);
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

  test('the callout never covers the top bar or the tab bar, and stays shown wherever IM-2 turns', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (const [step, key] of [...SWEEP.slice(0, 20), 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'].entries()) {
      await page.keyboard.press(key);
      await settledCentre(page, IM2).catch(() => null);
      await expect(callout(page), `move ${step}`).toHaveAttribute('data-shown', 'true');
      expect(await coveredBy(page, '.tab-bar'), `tab bar, move ${step}`).toBe(0);
      expect(await coveredBy(page, '.phone-bar'), `top bar, move ${step}`).toBe(0);
    }
  });
});

/** The ring's box once the globe has stopped turning. */
async function settledRing(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const read = () => ring(page).evaluate((el) => (el as HTMLElement).style.transform);
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
  return (await ring(page).boundingBox())!;
}

// QA F1 (VENT-32): the docked card covered the selected marker and its ring. Framing a site aims it into the free
// area between the top bar and the card.
for (const [width, height] of [[360, 780], [390, 844]] as const) {
  test.describe(`phone, ${width}x${height}, the card never covers the selected marker`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    async function expectClear(page: Page, label: string): Promise<void> {
      await expect(callout(page)).toHaveAttribute('data-shown', 'true');
      await expect(ring(page)).toBeVisible();
      const box = await settledRing(page);
      const card = (await callout(page).boundingBox())!;
      const bar = (await page.locator('.phone-bar').boundingBox())!;
      expect(shared(box, card), `${label}: ring under the card`).toBe(0);
      expect(shared(box, bar), `${label}: ring under the top bar`).toBe(0);
    }

    test('at load, with the sheet at half', async ({ page }) => {
      await open(page);
      await expect.poll(() => sheetTop(page)).toBe(height - 344);
      await expectClear(page, 'IM-2 at load');
    });

    test('after picking Statio Shiv Shakti', async ({ page }) => {
      await open(page);
      const tabs = page.getByRole('navigation', { name: 'Views' });
      await tabs.getByRole('button', { name: 'Sites' }).click();
      await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Statio Shiv Shakti/ }).click();
      await expect(callout(page)).toHaveAttribute('aria-label', 'Statio Shiv Shakti (Chandrayaan-3 Vikram)');
      await expectClear(page, 'Statio Shiv Shakti');
    });
  });
}

for (const [width, height] of [[1280, 800], [1440, 900]] as const) {
  test.describe(`desktop, ${width}x${height}, the card never covers the selected marker`, () => {
    test.use({ viewport: { width, height } });

    test('at load and after picking Statio Shiv Shakti', async ({ page }) => {
      await open(page);
      await expect(callout(page)).toHaveAttribute('data-shown', 'true');
      expect(shared(await settledRing(page), (await callout(page).boundingBox())!), 'IM-2 at load').toBe(0);
      await page.getByRole('button', { name: /^Change site, now/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Choose a site' });
      await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('vikram');
      await dialog.getByRole('button', { name: /^Statio Shiv Shakti/ }).click();
      await expect(callout(page)).toHaveAttribute('aria-label', 'Statio Shiv Shakti (Chandrayaan-3 Vikram)');
      expect(shared(await settledRing(page), (await callout(page).boundingBox())!), 'Statio Shiv Shakti').toBe(0);
    });
  });
}

// CI on edd4cc4: on a short laptop window the image card has no room above the Layers key; it shows as the compact
// card there instead of hiding.
for (const [width, height] of [[1024, 768], [1280, 720]] as const) {
  test.describe(`desktop, ${width}x${height}, 100 % text`, () => {
    test.use({ viewport: { width, height } });

    test('shows the compact card above the Layers key, clear of the selected marker', async ({ page }) => {
      await open(page);
      await expect(callout(page)).toHaveAttribute('data-fit', 'compact');
      await expect(callout(page)).toHaveAttribute('data-shown', 'true');
      await expect(part(page, 'media')).toBeHidden();
      await expect(part(page, 'pill')).toHaveText('Landing window · 7 d 1 h left');
      const card = (await callout(page).boundingBox())!;
      const layers = (await page.locator('section.globe .globe-layers').boundingBox())!;
      expect(card.x).toBe(layers.x);
      expect(Math.abs(card.y + card.height - (layers.y - 14))).toBeLessThanOrEqual(1);
      expect(shared(await settledRing(page), card)).toBe(0);
    });
  });
}

// QA F2 (VENT-32): at 200 % text the card no longer fits above the Layers key; the site card on the right already
// shows the site, so the callout hides instead of standing over the globe and its marker.
test.describe('desktop, 1440x900, 200 % text', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hides the card when it does not fit above the Layers key, and the selected marker stays visible', async ({ page }) => {
    await open(page);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await expect(callout(page)).toHaveAttribute('data-shown', 'false');
    await expect(callout(page)).toBeHidden();
    await expect(page.locator(IM2)).toBeVisible();
    await expect(ring(page)).toBeVisible();
  });
});
