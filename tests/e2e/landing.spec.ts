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

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';

// The landing at the domain's root (VENT-109), served by its own preview (playwright.config.ts, project `landing`).
const DIST = fileURLToPath(new URL('../../packages/landing/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));
// The landing's pages under the policy nginx sends, computed from its build as the image computes it.
const POLICY = /Content-Security-Policy "([^"]+)"/.exec(execFileSync('node', [CSP_SCRIPT, DIST], { encoding: 'utf8' }))?.[1] ?? '';
// The app's own preview, which serves what the landing links under /app/ (its icons), as nginx does in production.
const APP_ORIGIN = `http://localhost:${Number(process.env.PW_PORT ?? 4321)}`;
const WINDOW = new Date('2026-11-22T20:00:00Z');
const LOCALES = [
  ['', 'en', 'Sun for power.'],
  ['es/', 'es', 'Sol para la energía.'],
  ['fr/', 'fr', 'Le Soleil pour l’énergie.'],
  ['de/', 'de', 'Sonne für Strom.'],
  ['it/', 'it', 'Il Sole per l’energia.'],
] as const;

/** Serves each page under the production policy and records what the page reports wrong. */
async function strict(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  await page.route('**/app/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ response: await route.fetch({ url: `${APP_ORIGIN}${path}` }) });
  });
  await page.route(/\/((es|fr|de|it)\/)?(\?.*)?(#.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': POLICY } });
  });
  return problems;
}

test.describe('the landing (VENT-109)', () => {
  test('answers for IM-2 at the visitor\'s instant, under the production CSP', async ({ page }) => {
    const problems = await strict(page);
    await page.clock.install({ time: WINDOW });
    await page.goto('./');
    const card = page.locator('[data-live-card]');
    await expect(card).toHaveAttribute('data-state', 'window');
    await expect(card.locator('[data-live="verdict"]')).toHaveText('Landing window');
    await expect(card.locator('[data-live="sun"]')).toHaveText('6.7° up');
    await expect(card.locator('[data-live="listening"]')).toContainText('Robledo de Chavela');
    await expect(page.locator('[data-month-text="title"]')).toHaveText('November 2026 at IM-2 Athena');
    await expect(page.locator('[data-bar="window"] .month__run').first()).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('moves the month\'s line and the card on as the clock runs', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-12-02T12:00:00Z') });
    await page.goto('./');
    await expect(page.locator('[data-month-text="title"]')).toHaveText('December 2026 at IM-2 Athena');
    const now = page.locator('[data-month-now]');
    const share = async () => Number(await now.evaluate((n) => getComputedStyle(n).getPropertyValue('--now')));
    const before = await share();
    expect(before).toBeCloseTo((24 + 12) / (31 * 24), 3);
    await page.clock.runFor(2 * 60 * 60 * 1000);
    await expect.poll(share).toBeGreaterThan(before);
  });

  for (const [path, lang, title] of LOCALES) {
    test(`speaks ${lang} and opens the app in ${lang}`, async ({ page }) => {
      const problems = await strict(page);
      await page.goto(`./${path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('h1')).toContainText(title.replace('’', "'"));
      await expect(page.locator('.hero a.button--primary')).toHaveAttribute('href', `/app/${path}`);
      await expect(page.locator(`link[rel="alternate"][hreflang="x-default"]`)).toHaveCount(1);
      expect(problems).toEqual([]);
    });
  }

  for (const width of [360, 820, 1440]) {
    test(`fits ${width} px wide with every target 44 px or more`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('./');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBe(0);
      const small = await page.locator('a:visible').evaluateAll((links) =>
        links.filter((a) => a.getBoundingClientRect().height < 44).map((a) => a.textContent?.trim()),
      );
      expect(small).toEqual([]);
    });
  }

  test('sends an old link to one of the app\'s views on to the app', async ({ page }) => {
    await page.route('**/app/**', (route) => route.fulfill({ body: 'app', contentType: 'text/html' }));
    await page.goto('./es/#horizon');
    await expect(page).toHaveURL(/\/app\/es\/#horizon$/);
  });

  test('keeps its own anchors on the landing', async ({ page }) => {
    await page.goto('./#team');
    await expect(page).toHaveURL(/\/#team$/);
    await expect(page.locator('#team')).toBeInViewport();
  });

  test('stands still under reduced motion and reads without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('./');
    const animation = await page.locator('.hero__title').evaluate((n) => getComputedStyle(n).animationName);
    expect(animation).toBe('none');
    await expect(page.locator('[data-live="verdict"]')).not.toBeEmpty();
    await expect(page.locator('.hero__title')).toHaveCSS('opacity', '1');
    await context.close();
  });
});

const HERO_MEDIA = /\/media\/hero\//;
const SIZES = [
  ['desktop', 1440, 900],
  ['phone', 390, 844],
] as const;

/** Every request the page makes for the hero's film and frames, by path. */
function heroRequests(page: Page): string[] {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (HERO_MEDIA.test(request.url())) asked.push(new URL(request.url()).pathname);
  });
  return asked;
}

const shownFrame = (page: Page) => page.locator('.hero__poster').evaluate((img: HTMLImageElement) => img.currentSrc);

async function stillPage(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  return { context, page: await context.newPage() };
}

/** WCAG relative luminance of an sRGB channel triple, 0 to 255 each. */
function luminance(r: number, g: number, b: number): number {
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The 95th percentile luminance the page paints under each selector's box, the hero's words hidden. */
async function backdropLuminance(page: Page, selectors: readonly string[]): Promise<number[]> {
  const clips = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()));
  await page.addStyleTag({ content: '.hero__inner { visibility: hidden !important; }' });
  const shots = clips.map(async (clip) => {
    if (!clip) throw new Error('no box');
    const { data, info } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const values: number[] = [];
    for (let i = 0; i < info.width * info.height * 3; i += 3) values.push(luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0));
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length * 0.95)] ?? 1;
  });
  return Promise.all(shots);
}

test.describe('the hero film (VENT-116)', () => {
  test('shows the still alone under reduced motion: no start frame and no video asked', async ({ browser }) => {
    const { context, page } = await stillPage(browser, 1440, 900);
    const asked = heroRequests(page);
    await page.goto('./');
    const still = page.locator('.hero__poster');
    await expect(still).toBeVisible();
    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1920);
    await expect.poll(() => shownFrame(page)).toMatch(/hero-desktop-poster\.webp$/);
    await expect(still).toHaveAttribute('alt', /IM-2 Athena/);
    await expect(page.locator('.hero video source')).toHaveCount(0);
    await expect(page.locator('.hero video[aria-hidden="true"]')).toHaveCount(2);
    await page.waitForTimeout(500);
    expect(asked).toEqual(['/media/hero/hero-desktop-poster.webp']);
    await context.close();
  });

  // Under Save-Data nginx answers the start frame with the still's bytes (VENT-118, held by nginx-conf.test.ts), as
  // this route does, so the page must not ask for the still again: one picture and no video.
  test('shows the still under Save-Data with one picture asked and no video', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
    });
    await page.route('**/media/hero/hero-desktop-start.webp', async (route) => {
      const still = await route.fetch({ url: route.request().url().replace('-start.webp', '-poster.webp') });
      await route.fulfill({ response: still });
    });
    const asked = heroRequests(page);
    await page.goto('./');
    await expect(page.locator('[data-film]')).toHaveAttribute('data-film', 'still');
    const still = page.locator('.hero__poster');
    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(1920);
    await page.waitForTimeout(500);
    expect(asked).toEqual(['/media/hero/hero-desktop-start.webp']);
  });

  for (const [cut, width, height] of SIZES) {
    test(`plays the ${cut} cut's descent at ${width} x ${height}, under the production CSP`, async ({ page }) => {
      const problems = await strict(page);
      await page.setViewportSize({ width, height });
      const asked = heroRequests(page);
      await page.goto('./');
      // The page paints the descent's first frame, so the descent fades in over the same picture.
      expect(await shownFrame(page)).toMatch(new RegExp(`hero-${cut}-start\\.webp$`));
      await expect(page.locator('[data-film]')).toHaveAttribute('data-film', /descent|hold/, { timeout: 20_000 });
      const playing = await page.locator('[data-film-part="descent"]').evaluate((v: HTMLVideoElement) => v.currentSrc);
      expect(new URL(playing).pathname).toBe(`/media/hero/hero-${cut}-descent.av1.mp4`);
      expect(asked.every((path) => path.includes(`hero-${cut}-`))).toBe(true);
      expect(asked.filter((path) => path.endsWith('-poster.webp'))).toEqual([]);
      expect(problems).toEqual([]);
    });

    for (const frame of ['still', 'start'] as const) test(`keeps the words clear of the live card and legible over the ${frame} frame at ${width} x ${height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: frame === 'still' ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      // With motion the videos never answer, so the start frame stays painted.
      await page.route('**/*.mp4', () => undefined);
      await page.goto('./');
      await expect.poll(() => shownFrame(page)).toMatch(frame === 'still' ? /-poster\.webp$/ : /-start\.webp$/);
      await expect.poll(() => page.locator('.hero__poster').evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))).toBeGreaterThan(0);
      const box = async (selector: string) => {
        const found = await page.locator(selector).boundingBox();
        if (!found) throw new Error(`${selector} has no box`);
        return found;
      };
      const card = await box('[data-live-card]');
      for (const selector of ['.hero__head', '.hero__body', '.hero__credit']) {
        const words = await box(selector);
        const apart = words.y + words.height <= card.y || card.y + card.height <= words.y
          || words.x + words.width <= card.x || card.x + card.width <= words.x;
        expect(apart, selector).toBe(true);
      }
      // The lede's grey (#c7c8ce) keeps 4.5:1 over what the film paints under the copy.
      const lede = luminance(0xc7, 0xc8, 0xce);
      const selectors = ['.hero__title', '.hero__lede'] as const;
      const under = await backdropLuminance(page, selectors);
      under.forEach((value, i) => expect((lede + 0.05) / (value + 0.05), selectors[i]).toBeGreaterThanOrEqual(4.5));
      await context.close();
    });
  }
});

test.describe('the demo video (VENT-120)', () => {
  const DEMO = /\/media\/demo\//;

  test('plays the 68 s cut on a press only and links the 30 s cut, under the production CSP', async ({ page }) => {
    const problems = await strict(page);
    const asked: string[] = [];
    page.on('request', (request) => {
      if (DEMO.test(request.url())) asked.push(new URL(request.url()).pathname);
    });
    await page.goto('./');
    const video = page.locator('.team__player');
    await video.scrollIntoViewIfNeeded();
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('aria-label', 'Ventana Lunar demo video, 68 seconds');
    expect(await video.evaluate((v: HTMLVideoElement) => v.controls)).toBe(true);
    await page.waitForTimeout(500);
    expect(asked.filter((path) => path.endsWith('.mp4'))).toEqual([]);
    const short = page.getByRole('link', { name: 'Watch the 30-second cut' });
    await expect(short).toHaveAttribute('href', '/media/demo/ventana-lunar-30s.mp4');
    const answer = await page.request.get('/media/demo/ventana-lunar-30s.mp4', { headers: { Range: 'bytes=0-1023' } });
    expect(answer.status()).toBe(206);
    expect(answer.headers()['content-type']).toBe('video/mp4');
    expect(problems).toEqual([]);
  });

  test('names the video and the link in each language', async ({ page }) => {
    await page.goto('./es/');
    await expect(page.locator('.team__player')).toHaveAttribute('aria-label', 'Vídeo de demostración de Ventana Lunar, 68 segundos');
    await expect(page.getByRole('link', { name: 'Ver el corte de 30 segundos' })).toBeVisible();
  });
});
