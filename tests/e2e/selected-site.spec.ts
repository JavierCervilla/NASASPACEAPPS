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
 * The selected site without a card on the globe (VENT-33, canvases «PillStateP1…», «SheetThumbD» and
 * «DeskThumbH1440/H1280»): on a phone the site pill says the state at the selected instant with its time left, the top
 * bar's subtitle is the legend's rule, and the sheet's head carries the LOLA relief; on a desktop the relief heads the
 * site card. The selected marker's ring, and the framing that keeps it in the free band, are checked here too.
 */
import { expect, test, type Page } from '@playwright/test';
import { SITES, stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const IM1 = '[data-site-id="im1-odysseus"]';
const IM2 = '[data-site-id="im2-athena"]';
const ring = (page: Page) => page.locator('.globe-ring');
const pill = (page: Page) => page.locator('.site-pill');
/** The state line the pill shows: the longest of its lines that fits (FitLine.tsx). */
const shown = (page: Page) => pill(page).locator('.site-pill__state .fit-line__shown');
const media = (page: Page) => page.locator('.card-media');
const HOUR_MS = 3_600_000;

async function open(page: Page, scheme: 'dark' | 'light' = 'dark', at = NOW): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme });
  await page.clock.setFixedTime(at);
  await stubApi(page);
  await page.goto('./');
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
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

  test('no card floats over the globe; the site card heads with the relief, the state and its frame', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await open(page);
    await expect(page.locator('.globe-callout')).toHaveCount(0);
    const image = media(page).getByRole('img', { name: 'Mons Mouton from orbit, LOLA relief' });
    await expect(image).toHaveAttribute('src', '/thumbs/im2-athena.jpg');
    await expect(image).toHaveAttribute('decoding', 'async');
    // A 1x screen picks the 320 px file from the srcset.
    await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).currentSrc)).toMatch(/\/thumbs\/im2-athena\.jpg$/);
    await expect(image).toHaveAttribute('data-ready', 'true');
    expect((await media(page).boundingBox())?.height).toBe(150);
    await expect(media(page).locator('.card-media__badge')).toHaveText('Landing window now');
    await expect(media(page).locator('.card-media__caption')).toHaveText('LOLA · 30 km');
    // The relief sits inside the card's head, above the mission line.
    const head = page.getByRole('complementary', { name: 'Site card' }).locator('.card-head');
    await expect(head.locator('.card-media')).toHaveCount(1);
    expect(requested.filter((url) => url.includes('/thumbs/'))).toEqual([expect.stringMatching(/\/thumbs\/im2-athena\.jpg$/)]);
  });

  test('the badge follows the slider: 9 November, 08:00 is neither at IM-2', async ({ page }) => {
    await open(page);
    await page.getByRole('slider').first().fill('200');
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'none');
    await expect(media(page).locator('.card-media__badge')).toHaveText('Neither');
  });

  test('a site north of 80° S shows no image and no empty frame', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.getByRole('complementary', { name: 'Site card' }).getByRole('heading', { name: 'Apollo 11' })).toBeVisible();
    await expect(media(page)).toHaveCount(0);
    await expect(page.locator('.site-card img')).toHaveCount(0);
  });

  test('a new site hides the old image until its own has loaded', async ({ page }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/thumbs/im1-odysseus*', async (route) => {
      await held;
      await route.fallback();
    });
    await open(page);
    const image = page.locator('.card-media__image');
    await expect(image).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: /^Malapert A region \(IM-1 Odysseus\)/ }).press('Enter');
    await expect(image).toHaveAttribute('src', '/thumbs/im1-odysseus.jpg');
    await expect(image).toHaveAttribute('data-ready', 'false');
    await expect(image).toHaveCSS('visibility', 'hidden');
    release();
    await expect(image).toHaveAttribute('data-ready', 'true');
    await expect(image).toHaveCSS('visibility', 'visible');
  });

  test('the ring stays on the selected marker, hides with it behind the limb, and is still under reduced motion', async ({ page }) => {
    await open(page);
    const marker = await settledCentre(page, IM2);
    const box = (await ring(page).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - marker.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - marker.y)).toBeLessThanOrEqual(1);
    expect(await ring(page).evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('none');
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowUp');
    await expect(page.locator(IM2)).toBeHidden();
    await expect(ring(page)).toBeHidden();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowDown');
    await expect(ring(page)).toBeVisible();
  });

  test('pulses the ring for 2.4 s in the state\'s colour, with motion allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await page.goto('./');
    await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', 'window');
    const style = await ring(page).evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      return [after.animationName, after.animationDuration, after.animationIterationCount, after.borderTopColor];
    });
    expect(style).toEqual(['globe-ring-pulse', '2.4s', 'infinite', 'rgb(61, 220, 132)']);
  });

  test('the selected marker takes its state colour and a halo of it, and keeps its clicks', async ({ page }) => {
    await open(page);
    const dot = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el, '::after').backgroundColor);
    await expect.poll(() => dot(IM2)).toBe('rgb(61, 220, 132)');
    expect(await page.locator(IM2).evaluate((el) => getComputedStyle(el, '::after').boxShadow)).toContain('0.862745 0.517647 / 0.28) 0px 0px 0px 5px');
    await page.getByRole('slider').first().fill('200');
    await expect.poll(() => dot(IM2)).toBe('rgb(58, 60, 68)');
    const im1 = await settledCentre(page, IM1);
    await page.mouse.click(im1.x, im1.y);
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => dot(IM2)).toBe('rgb(242, 242, 244)');
  });
});

test.describe('desktop, 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('a lower relief band keeps the two countdowns above the fold', async ({ page }) => {
    await open(page);
    expect((await media(page).boundingBox())?.height).toBe(96);
    const card = (await page.locator('.site-card').boundingBox())!;
    for (const tile of await page.locator('.card-tile').all()) {
      const box = (await tile.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height);
    }
  });
});

// The file a 2x screen needs for the drawn width: the 320 px card x 2 on a desktop, the 40 px head x 2 on a phone.
for (const [name, viewport, isMobile, file, selector] of [
  ['desktop', { width: 1440, height: 900 }, false, 'im2-athena@2x.jpg', '.card-media__image'],
  ['phone', { width: 390, height: 844 }, true, 'im2-athena.jpg', '.summary__thumb'],
] as const) {
  test.describe(`${name} at 2x`, () => {
    test.use({ viewport, deviceScaleFactor: 2, isMobile, hasTouch: isMobile });

    test(`fetches one thumbnail, ${file}, the one its drawn size needs`, async ({ page }) => {
      const requested: string[] = [];
      page.on('request', (request) => requested.push(request.url()));
      await open(page);
      const image = page.locator(selector);
      const pattern = new RegExp(`/thumbs/${file.replace('.', '\\.')}$`);
      await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).currentSrc)).toMatch(pattern);
      await page.waitForLoadState('networkidle');
      expect(requested.filter((url) => url.includes('/thumbs/'))).toEqual([expect.stringMatching(pattern)]);
    });
  });
}

/** A constant sky for IM-2 from the request's `from` to `to`: one state the whole range. */
async function stubSky(page: Page, sunEl: number, earthEl: number): Promise<void> {
  await page.route(/\/api\/v1\/sites\/im2-athena\?/, (route) => {
    const url = new URL(route.request().url());
    // A day (its first hour, or with `end` its last) or a UTC instant on the hour, as the API takes them.
    const day = (raw: string | null, end: boolean) =>
      /^\d{4}-\d{2}-\d{2}$/.test(raw ?? '') ? Date.parse(`${raw}T${end ? '23' : '00'}:00:00Z`) : Date.parse(raw ?? '');
    const hours = [];
    for (let t = day(url.searchParams.get('from'), false); t <= day(url.searchParams.get('to'), true); t += HOUR_MS) {
      hours.push({ t: new Date(t).toISOString().replace('.000Z', 'Z'), sunAz: 0, earthAz: 0, sunEl, earthEl, dsn: null });
    }
    return route.fulfill({ json: { site: SITES.find((s) => s.id === 'im2-athena'), ephemeris: { hours } } });
  });
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('no card floats over the globe; the pill says the state and the subtitle is the legend\'s rule', async ({ page }) => {
    await open(page);
    await expect(page.locator('.globe-callout')).toHaveCount(0);
    await expect(pill(page)).toHaveAccessibleName('Change site, now Mons Mouton (IM-2 Athena): Window · 7 d left');
    await expect(pill(page).locator('.site-pill__name')).toHaveText('IM-2');
    await expect(shown(page)).toHaveText('Window · 7 d left');
    const rule = page.locator('.phone-bar__rule');
    await expect(rule).toHaveText('Sun + Earth = window');
    const colour = (tone: string) => rule.locator(`[data-tone="${tone}"]`).evaluate((el) => getComputedStyle(el).color);
    expect([await colour('sun'), await colour('earth'), await colour('window')]).toEqual([
      'rgb(245, 197, 66)', 'rgb(74, 156, 255)', 'rgb(61, 220, 132)',
    ]);
    // The «+» and «=» stay in the secondary text colour.
    expect(await rule.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(199, 200, 206)');
    await expect(page.getByText('Drag the Moon · pinch to zoom')).toHaveCount(0);
  });

  for (const [kind, sunEl, earthEl, words, colour] of [
    ['window', 5, 8, 'Window', 'rgb(61, 220, 132)'],
    ['sun', 5, -2, 'Sun', 'rgb(245, 197, 66)'],
    ['earth', -5, 8, 'Earth', 'rgb(74, 156, 255)'],
    ['none', -5, -2, 'Neither', 'rgb(199, 200, 206)'],
  ] as const) {
    test(`the pill says «${words}» with its time left, in its colour`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
      await page.clock.setFixedTime(NOW);
      await stubApi(page);
      await stubSky(page, sunEl, earthEl);
      await page.goto('./');
      const state = pill(page).locator('.site-pill__state');
      await expect(state).toHaveAttribute('data-tone', kind);
      await expect(shown(page)).toHaveText(new RegExp(`^${words} · \\d+\\+ d left$`));
      expect(await shown(page).evaluate((el) => getComputedStyle(el).color)).toBe(colour);
      await expect(pill(page).locator('.signal-dot')).toHaveAttribute('data-state', kind);
    });
  }

  // Orchestrator's decision on PR #19: a failed Horizons keeps the computed state in the pill, hollow and named
  // computed, and the sheet says Horizons is unavailable. «Data unavailable» stays for a site with nothing computed
  // (site-state.test.ts, data-source.test.ts).
  test('when Horizons fails, the pill keeps the computed state, hollow, and the sheet says Horizons is down', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(NOW);
    await stubApi(page, { status: 500 });
    await page.goto('./');
    await expect(page.getByRole('status').filter({ hasText: 'Horizons unavailable' })).toBeVisible();
    await expect(shown(page)).toHaveText(/^Window · /);
    await expect(pill(page).locator('.signal-dot')).toHaveAttribute('data-computed', 'true');
    await expect(pill(page)).toHaveAccessibleName(/, computed$/);
  });

  test('the sheet\'s head carries the relief at half and at peek, and none for a site north of 80° S', async ({ page }) => {
    await open(page);
    const thumb = page.locator('.summary__head .summary__thumb');
    await expect(thumb).toHaveAttribute('alt', 'Mons Mouton from orbit, LOLA relief');
    await expect(thumb).toHaveAttribute('data-ready', 'true');
    await expect(thumb).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: /^Sheet half height/ }).press('Enter');
    await page.getByRole('button', { name: /^Sheet full height/ }).press('Enter');
    await expect(page.getByRole('button', { name: /^Sheet collapsed/ })).toBeVisible();
    // At peek the head still clears the tab bar, thumbnail included.
    const tabs = (await page.locator('.tab-bar').boundingBox())!;
    await expect.poll(async () => {
      const box = (await thumb.boundingBox())!;
      return box.y + box.height <= tabs.y;
    }).toBe(true);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Sites' }).click();
    await page.getByRole('button', { name: 'Apollo', exact: true }).click();
    await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(page.locator('.summary__name')).toHaveText('Mare Tranquillitatis (Tranquility Base)');
    await expect(page.locator('.summary__head img')).toHaveCount(0);
  });
});

/** Whether `selector`'s text is all drawn: nothing scrolled out, no ellipsis. */
const whole = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => el.scrollWidth <= el.clientWidth);

// QA on PR #16: at 320 px, and at 390 px with 200 % text, the state was cut to «Window · 23 h…» and «Window · …».
// The titles wrap first; the pill then drops «left», then the name, and always keeps the time. 29 November, 20:00:
// IM-2's window has 23 h left, the longest «h» line QA saw cut.
const LATE = new Date('2026-11-29T20:00:00Z');
for (const [width, height, text, full] of [
  [360, 780, 100, true],
  [320, 640, 100, false],
  [390, 844, 200, false],
  [320, 640, 200, false],
] as const) {
  test.describe(`phone, ${width}x${height}, ${text} % text, no overflow`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('the bar\'s titles and pill sit side by side, the time left is drawn whole, and nothing scrolls sideways', async ({ page }) => {
      await open(page, 'dark', LATE);
      if (text !== 100) await page.addStyleTag({ content: `html { font-size: ${text}%; }` });
      await expect(shown(page)).toHaveText(full ? 'Window · 23 h left' : /^(Window · )?23 h( left)?$/);
      await expect.poll(() => whole(page, '.site-pill__state .fit-line__shown')).toBe(true);
      const boxOf = async (selector: string) => (await page.locator(selector).boundingBox())!;
      const [bar, titles, box] = [await boxOf('.phone-bar'), await boxOf('.phone-bar__titles'), await boxOf('.site-pill')];
      expect(titles.x + titles.width).toBeLessThanOrEqual(box.x + 0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(bar.x + bar.width);
      for (const selector of ['.phone-bar__title', '.phone-bar__rule', '.site-pill__name']) {
        expect(await whole(page, selector), selector).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });
}

test.describe('phone, 360x780, the longest state', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });

  test('«Neither · 30+ d left» fits the pill whole', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.clock.setFixedTime(NOW);
    await stubApi(page);
    await stubSky(page, -5, -2);
    await page.goto('./');
    await expect(shown(page)).toHaveText(/^Neither · \d+\+ d left$/);
    expect(await whole(page, '.site-pill__state .fit-line__shown')).toBe(true);
    const titles = (await page.locator('.phone-bar__titles').boundingBox())!;
    expect(titles.x + titles.width).toBeLessThanOrEqual((await pill(page).boundingBox())!.x);
  });
});

/** The ring's box once the globe has stopped turning. */
async function settledRing(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  await settledCentre(page, '.globe-ring');
  return (await ring(page).boundingBox())!;
}

// QA F1 (VENT-32), now without the card: framing a site aims it into the free band between the top bar and the
// sheet's top edge.
for (const [width, height] of [[360, 780], [390, 844]] as const) {
  test.describe(`phone, ${width}x${height}, the selected marker lands between the top bar and the sheet`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    async function expectInBand(page: Page, label: string): Promise<void> {
      await expect(ring(page)).toBeVisible();
      const box = await settledRing(page);
      const bar = (await page.locator('.phone-bar').boundingBox())!;
      const sheet = await page.locator('.sheet').evaluate((el) => el.getBoundingClientRect().top);
      expect(box.y, `${label}: ring under the top bar`).toBeGreaterThanOrEqual(bar.y + bar.height);
      expect(box.y + box.height, `${label}: ring under the sheet`).toBeLessThanOrEqual(sheet);
    }

    test('at load, with the sheet at half', async ({ page }) => {
      await open(page);
      await expect.poll(() => page.locator('.sheet').evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(height - 344);
      await expectInBand(page, 'IM-2 at load');
    });

    test('after picking Statio Shiv Shakti', async ({ page }) => {
      await open(page);
      const tabs = page.getByRole('navigation', { name: 'Views' });
      await tabs.getByRole('button', { name: 'Sites' }).click();
      await page.getByRole('list', { name: 'Sites' }).getByRole('button', { name: /^Statio Shiv Shakti/ }).click();
      await expect(page.locator('[data-site-id="chandrayaan3-vikram"]')).toHaveAttribute('aria-pressed', 'true');
      await expectInBand(page, 'Statio Shiv Shakti');
    });
  });
}
