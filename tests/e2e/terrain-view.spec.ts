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
 * The on-foot 3D view (VENT-34, the human's verdict): the «Horizon» tab opens the selected point from the ground in
 * first person, the eye 2 m up, with no camera switch, astronaut or lander (VENT-54); the relief comes from the stubbed `/api/v1/terrain/tile`, the far
 * horizon from the point's profile, so the Sun is drawn hidden exactly where the profile hides it; the caption says
 * what is illustrative; an idle view draws no frames; and none of the view's files is in the first load.
 *
 * At 85.50° S 40.00° E on 22 November 2026 at 20:00 UTC the Sun stands 5.7° up at 339° and the Earth 9.1° up at 314°
 * (api-stub.ts); the view opens toward the Sun.
 */
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { stubApi } from './api-stub';
import { stubRealRelief, stubTile, stubWall } from './terrain-stub';

const AT = new Date('2026-11-22T20:00:00Z');
/** IM-2 with the Sun just over its ridge (horizon.spec.ts), on the recorded LOLA relief (terrain-stub.ts). */
const RIDGE_AT = new Date('2026-11-30T20:00:00Z');
const POINT = '?lat=-85.50&lon=40.00';
const SHOTS = process.env.VENT34_SHOTS;
/** The view's files, never in the first load (scripts/service-worker.mjs ON_DEMAND). */
const VIEW_FILES = /\/_astro\/(TerrainPanel|terrain-scene|on-foot)[.-]|\/api\/v1\/terrain\/tile/;
/** A model the view no longer draws (VENT-54): no glb, no astronaut, no lander. */
const MODEL_FILES = /\.glb(\?|$)|astronaut|lander|apollo-lm/;
const START_MS = 30_000;
/**
 * A string only the view's panel and only its scene carry (OnFootStageArea's host class, sun-mask.ts's uniform): a
 * static import of either lands it in the first load whatever the chunk is called, which VIEW_FILES cannot see.
 */
const PANEL_MARK = 'on-foot__host';
const SCENE_MARK = 'uSunMask';

/** Keeps the text of every script the page loads, by URL, until `done` settles them. */
function collectScripts(page: Page): { readonly done: () => Promise<Map<string, string>> } {
  const texts = new Map<string, string>();
  const reads: Promise<void>[] = [];
  page.on('response', (response) => {
    if (!/\.js(\?|$)/.test(response.url())) return;
    reads.push(response.text().then((text) => void texts.set(response.url(), text)).catch(() => undefined));
  });
  return { done: async () => (await Promise.all(reads), texts) };
}

const carrying = (texts: Map<string, string>, mark: string): string[] =>
  [...texts].filter(([, text]) => text.includes(mark)).map(([url]) => url);

interface Open {
  readonly path: string;
  /** The wall of the point's horizon, degrees of azimuth. */
  readonly wall?: readonly [number, number];
  readonly requests?: string[];
  /** The recorded LOLA relief of IM-2 instead of the synthetic one, at this instant. */
  readonly real?: Date;
  /** The page's clock runs from the instant (the follow-clock ticks each minute) instead of standing still. */
  readonly live?: boolean;
}

/** Counts the WebGL contexts the page gives up (`WEBGL_lose_context.loseContext`, what forceContextLoss calls). */
async function countLostContexts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __lostContexts: number };
    w.__lostContexts = 0;
    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const proto = Context.prototype as unknown as { getExtension: (this: unknown, name: string) => unknown };
      const getExtension = proto.getExtension;
      proto.getExtension = function (this: unknown, name: string) {
        const extension = getExtension.call(this, name) as { loseContext?: () => void } | null;
        const lose = extension?.loseContext;
        if (name === 'WEBGL_lose_context' && extension && lose) {
          extension.loseContext = function (...args: []) {
            w.__lostContexts += 1;
            return lose.apply(this, args);
          };
        }
        return extension;
      };
    }
  });
}

const lostContexts = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __lostContexts: number }).__lostContexts);

async function open(page: Page, { path, wall = [300, 330], requests, real, live }: Open): Promise<void> {
  if (live) await page.clock.install({ time: real ?? AT });
  else await page.clock.setFixedTime(real ?? AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await countLostContexts(page);
  if (requests) page.on('request', (request) => requests.push(request.url()));
  await stubApi(page);
  if (real) await stubRealRelief(page);
  else {
    await stubWall(page, ...wall);
    await stubTile(page);
  }
  await page.goto(path);
}

/** Screenshots the view every 60° round (VENT34_SHOTS only), the draws it cost in the name's log line. */
async function shotsAround(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  await host(page).focus();
  for (let i = 0; i < 6; i++) {
    await idle(page);
    const draws = await host(page).getAttribute('data-draws');
    console.log(`${name}-${i * 60}: draws,triangles = ${draws}`);
    await shot(page, `${name}-${i * 60}`);
    for (let k = 0; k < 4; k++) await page.keyboard.press('Shift+ArrowRight');
  }
}

const view = (page: Page) => page.getByRole('region', { name: 'On foot at the site' });
const host = (page: Page) => view(page).getByRole('application', { name: 'On foot at the site' });

/** Waits until the scene stands (its maps loaded) and has drawn. */
async function settled(page: Page): Promise<void> {
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(0);
}

/**
 * The view is first person only (VENT-54): its text alternative says so, it offers no camera switch, and its caption
 * credits no lander or astronaut.
 */
async function firstPersonOnly(page: Page): Promise<void> {
  await expect(host(page)).toHaveAccessibleDescription(/^First person, eyes 2 m above the ground\. View heading /);
  await expect(view(page).getByRole('radiogroup')).toHaveCount(0);
  await expect(view(page).getByRole('radio')).toHaveCount(0);
  await expect(view(page)).not.toContainText(/Third person/);
  await expect(view(page).locator('.on-foot__caption')).not.toContainText(/lander|Apollo|astronaut/i);
}

const frames = async (page: Page): Promise<number> => Number(await host(page).getAttribute('data-frames'));

/**
 * Waits until no frame has been drawn on `at` (the view's host) for 600 ms (a resize or the sheet settling) and the ring's slices are all run
 * (`data-working`, written by every frame: the slices ask for a frame every 1.5 s at most, so a quiet 600 ms is no
 * proof), and returns the count.
 */
async function idle(page: Page, at = host(page)): Promise<number> {
  let last = -1;
  await expect
    .poll(async () => {
      const now = Number(await at.getAttribute('data-frames'));
      const still = now === last && (await at.getAttribute('data-working')) !== 'true';
      last = now;
      return still;
    }, { intervals: [600], timeout: 15_000 })
    .toBe(true);
  return last;
}

/** The brightest channel around «x,y» on the screen, 0 to 255. */
async function brightness(page: Page, at: string): Promise<number> {
  const box = await host(page).boundingBox();
  const [x, y] = at.split(',').map(Number) as [number, number];
  const clip = { x: (box?.x ?? 0) + x - 2, y: (box?.y ?? 0) + y - 2, width: 5, height: 5 };
  const raw = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer();
  return Math.max(...raw);
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Takes the GPU context away from the view's canvas, as a GPU process restart does. */
const loseContext = (page: Page) => host(page).locator('canvas').evaluate((canvas) => {
  (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
});

/** Whether `button` is on the screen and on top: its box inside the viewport and its centre's topmost element in it. */
async function pressable(page: Page, button: ReturnType<Page['locator']>): Promise<boolean> {
  return button.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const inside = box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight;
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return inside && box.width > 0 && top !== null && el.contains(top);
  });
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the Horizon tab opens in first person, with no camera switch and no model fetched, and says what is illustrative', async ({ page }) => {
    const requests: string[] = [];
    const scripts = collectScripts(page);
    await open(page, { path: `./${POINT}`, requests });
    await expect(page.locator('.globe-viewport')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requests.filter((url) => VIEW_FILES.test(url))).toEqual([]);
    const first = await scripts.done();
    expect(carrying(first, PANEL_MARK)).toEqual([]);
    expect(carrying(first, SCENE_MARK)).toEqual([]);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
    await expect(page).toHaveURL(/#horizon$/);
    await settled(page);
    expect(requests.some((url) => /terrain-scene\./.test(url))).toBe(true);
    const all = await scripts.done();
    expect(carrying(all, PANEL_MARK)).not.toEqual([]);
    expect(carrying(all, SCENE_MARK)).not.toEqual([]);
    await firstPersonOnly(page);
    await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 20 m');
    await expect(view(page)).toContainText('Earth: NASA Blue Marble · shadows lifted for legibility');
    await expect(view(page).getByRole('region', { name: 'Horizon' })).toBeVisible();
    await expect(view(page).locator('.on-foot__label--ring').first()).toBeVisible();
    await idle(page);
    expect(requests.filter((url) => MODEL_FILES.test(url))).toEqual([]);
    await shot(page, 'synthetic-desktop-first');
  });

  test('an idle view draws no frames; a key turns it and draws again', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon` });
    await settled(page);
    const settledAt = await idle(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(settledAt);
    await host(page).focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => frames(page)).toBeGreaterThan(settledAt);
    await expect(host(page)).toHaveAccessibleDescription(/View heading 334°, to the north-west\. .*The Sun is to the north, above the terrain\./);
  });

  // VENT-52: the host's ring was an inset box-shadow, painted under its own canvas, so focus showed nothing.
  test('the view shows a focus ring over its canvas when the keyboard focuses it', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon` });
    await settled(page);
    await idle(page);
    const box = await host(page).boundingBox();
    const edge = `${Math.round((box?.width ?? 0) / 2)},3`;
    const before = await brightness(page, edge);
    await host(page).focus();
    await expect.poll(() => brightness(page, edge)).toBeGreaterThan(Math.max(before + 100, 200));
  });

  // VENT-49: a Pixel's GPU process restarted under the view; a lost context frees the scene and never remounts itself.
  test('a lost GPU context frees the view and says so; «Try again» opens it again at low, with no idle frames', async ({ page }) => {
    await open(page, { path: `./${POINT}&quality=medium#horizon` });
    await settled(page);
    await expect(host(page)).toHaveAttribute('data-tier', 'medium');
    await idle(page);
    await host(page).locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await expect(view(page).getByRole('status')).toContainText('Terrain unavailable right now');
    await expect(host(page)).toHaveAttribute('data-status', 'lost');
    await expect(host(page).locator('canvas')).toHaveCount(0);
    const retry = view(page).getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible();
    // Nothing remounts by itself: the view stays as it is until the tap.
    await page.waitForTimeout(2500);
    await expect(host(page).locator('canvas')).toHaveCount(0);
    await retry.click();
    // The new mount writes the tier and clears the old ready mark in one task.
    await expect(host(page)).toHaveAttribute('data-tier', 'low');
    await settled(page);
    await expect(host(page).locator('canvas')).toHaveCount(1);
    await expect(view(page).getByRole('status')).toHaveCount(0);
    const settledAt = await idle(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(settledAt);
  });

  // VENT-49 part 2: the dead canvas must not outlive the context, or the browser's broken-WebGL icon and a frozen frame show
  // under the message; and «Copy report» hands over what the view did, for a crash nobody can reproduce on a desk.
  test('a lost context takes the canvas out before the message shows, and «Copy report» copies the trail beside «Try again»', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, { path: `./${POINT}&quality=medium#horizon` });
    await settled(page);
    await idle(page);
    // The page's own order of events: the canvas leaves in the browser's event, the message a render later.
    await page.evaluate(() => {
      const order: string[] = [];
      (window as unknown as { __order: string[] }).__order = order;
      const stage = document.querySelector('.on-foot__stage');
      new MutationObserver((records) => {
        for (const record of records) {
          record.removedNodes.forEach((node) => node.nodeName === 'CANVAS' && order.push('canvas removed'));
          record.addedNodes.forEach((node) => (node as Element).classList?.contains('on-foot__status') && order.push('message shown'));
        }
      }).observe(stage as Node, { childList: true, subtree: true });
    });
    await host(page).locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await expect(view(page).getByRole('status')).toContainText('Terrain unavailable right now');
    expect(await page.evaluate(() => (window as unknown as { __order: string[] }).__order)).toEqual(['canvas removed', 'message shown']);
    await expect(host(page).locator('canvas')).toHaveCount(0);
    await expect(view(page).locator('.on-foot__label')).toHaveCount(0);

    const retry = view(page).getByRole('button', { name: 'Try again' });
    const copy = view(page).getByRole('button', { name: 'Copy report' });
    await expect(retry).toBeVisible();
    await expect(copy).toBeVisible();
    // Side by side, both 44 px targets; nothing says «crash».
    const [retryBox, copyBox] = await Promise.all([retry.boundingBox(), copy.boundingBox()]);
    expect(retryBox?.height).toBeGreaterThanOrEqual(44);
    expect(copyBox?.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs((retryBox?.y ?? 0) - (copyBox?.y ?? 99))).toBeLessThan(2);
    expect(copyBox?.x).toBeGreaterThan((retryBox?.x ?? 0) + (retryBox?.width ?? 0));
    await expect(view(page).getByRole('status')).not.toContainText(/crash|error|fail/i);
    await shot(page, 'lost-state');

    await copy.click();
    await expect(view(page).getByRole('status')).toContainText('Report copied');
    const report = await page.evaluate(() => navigator.clipboard.readText());
    expect(report).toContain('Ventana Lunar on-foot view report');
    expect(report).toContain('Tier: medium');
    expect(report).toMatch(/^ {2}[\d.]+ context lost, /m);
    for (const step of ['mount at tier medium', 'scene mounted at tier medium', 'stage created', 'near ground standing', 'near ground placed', 'all parts loaded']) {
      expect(report).toContain(step);
    }
    expect(report).toMatch(/ring level 0 settled/);
    expect(report).toMatch(/Last frames: seconds, draw calls, triangles, draw ms\n {2}[\d.]+ \d+ \d+ [\d.]+/);
    expect(report).toMatch(/GPU memory: \d+ geometries, \d+ textures/);
    // The report is a log of this device, not of the interface: English whatever the page's language.
    expect(report).toMatch(/^Page: \/\?.*lat=-85\.50.*#horizon$/m);
    // A reload keeps the run: the session's storage holds it for the next page.
    const kept = await page.evaluate(() => sessionStorage.getItem('ventana.onFootReport'));
    expect(kept).toContain('context lost');
  });

  test('«Copy report» says so when nothing could be copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, { path: `./${POINT}&quality=medium#horizon` });
    await settled(page);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
      document.execCommand = () => false;
    });
    await host(page).locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await view(page).getByRole('button', { name: 'Copy report' }).click();
    await expect(view(page).getByRole('status')).toContainText('Could not copy the report');
  });

  // VENT-51 M2: «Report copied» belongs to one lost state; after «Try again» the next loss has copied nothing yet.
  test('a second lost context does not say «Report copied» from the first', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, { path: `./${POINT}&quality=medium#horizon` });
    await settled(page);
    const lose = () => host(page).locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await lose();
    await view(page).getByRole('button', { name: 'Copy report' }).click();
    await expect(view(page).getByRole('status')).toContainText('Report copied');
    await view(page).getByRole('button', { name: 'Try again' }).click();
    await expect(host(page)).toHaveAttribute('data-tier', 'low');
    await settled(page);
    await lose();
    await expect(view(page).getByRole('status')).toContainText('Terrain unavailable right now');
    await expect(view(page).getByRole('status')).not.toContainText(/Report copied|Could not copy/);
  });

  // VENT-49 part 2: a Pixel's GPU reset a while after the view opened, with the live clock re-lighting every ring each minute
  // for a Sun that moves 0.008 degrees. Only a move of 0.1 degrees lights and draws again.
  test('the live clock does not relight or draw the view each minute; a scrub of an hour does, and the trail says both', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon`, live: true });
    await settled(page);
    const settledAt = await idle(page);
    const steps = () => page.evaluate(() => {
      const kept = JSON.parse(sessionStorage.getItem('ventana.onFootReport') ?? '{}') as { current?: { steps: { text: string; count: number }[] } };
      return kept.current?.steps ?? [];
    });
    const relights = async () => (await steps()).filter((step) => /^relight: Sun moved/.test(step.text)).length;
    const lit = await relights();
    await page.clock.runFor('02:00');
    await page.waitForTimeout(1500);
    const skipped = (await steps()).filter((step) => step.text.startsWith('instant skipped: Sun moved 0.0'));
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped.at(-1)?.text).toMatch(/Sun moved 0\.0\d\d deg, Earth 0\.0\d\d deg since the last relight$/);
    expect(await relights()).toBe(lit);
    expect(await frames(page)).toBe(settledAt);

    const slider = page.getByRole('slider', { name: 'Selected hour' });
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => frames(page)).toBeGreaterThan(settledAt);
    expect(await relights()).toBe(lit + 1);
    const last = (await steps()).filter((step) => /^relight: Sun moved/.test(step.text)).at(-1);
    expect(last?.text).toMatch(/Sun moved 0\.[45]\d\d deg/);
  });

  // VENT-49: the diagnostic switch for bisecting a crash on a phone's address bar. An old link that still names the
  // astronaut or the lander (gone in VENT-54) opens the view all the same: those words are ignored.
  test('?onfoot= leaves parts out, says which on the host, and the view still settles with no idle frames', async ({ page }) => {
    const requests: string[] = [];
    await open(page, { path: `./${POINT}&onfoot=astronaut,lander,far#horizon`, requests });
    await settled(page);
    await expect(host(page)).toHaveAttribute('data-onfoot', 'far');
    expect(requests.some((url) => /\/terrain\/tiles\?.*levels=2(&|$)/.test(url))).toBe(true);
    expect(requests.some((url) => /\/terrain\/tiles\?.*levels=[34]/.test(url))).toBe(false);
    const settledAt = await idle(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(settledAt);
  });

  test('the Sun is drawn where the profile shows it', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon` });
    await settled(page);
    await idle(page);
    const shown = (await host(page).getAttribute('data-sun-at')) ?? '';
    expect(shown).not.toBe('');
    expect(await brightness(page, shown)).toBeGreaterThan(200);
  });

  test('the Sun is drawn hidden behind the far horizon where the profile hides it', async ({ page }) => {
    await open(page, { path: `./${POINT}#horizon`, wall: [330, 350] });
    await settled(page);
    await idle(page);
    await expect(host(page)).toHaveAccessibleDescription(/The Sun is to the north, hidden by the terrain\. Terrain more than 2 km away hides the Sun\./);
    const hidden = (await host(page).getAttribute('data-sun-at')) ?? '';
    expect(hidden).not.toBe('');
    expect(await brightness(page, hidden)).toBeLessThan(80);
    await shot(page, 'desktop-sun-hidden');
  });

  test('IM-2 on its real LOLA relief: the Sun just over the ridge, the shipped skyline behind', async ({ page }) => {
    await open(page, { path: './?site=im2-athena&quality=high#horizon', real: RIDGE_AT });
    await settled(page);
    await idle(page);
    await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 80 m');
    await expect(host(page)).toHaveAccessibleDescription(/The Sun is to the .*, above the terrain\./);
    await firstPersonOnly(page);
    await shot(page, 'desktop-first');
    await shotsAround(page, 'desktop-first-round');
  });

  test('says so when the server has no terrain for the point, and offers no 3D', async ({ page }) => {
    await page.clock.setFixedTime(AT);
    await stubApi(page);
    await stubTile(page, { status: 404, error: 'no terrain data covers this point' });
    await page.goto(`./${POINT}#horizon`);
    await expect(view(page).getByRole('status')).toHaveText('No terrain covers this point on the server');
    await expect(host(page).locator('canvas')).toHaveCount(0);
  });

  test('says there is no terrain, with no retry, when the list answers but every tile is a 404', async ({ page }) => {
    const seen: string[] = [];
    await page.clock.setFixedTime(AT);
    await stubApi(page);
    await stubTile(page, { tileStatus: 404, error: 'no terrain data covers this point', seen });
    await page.goto('./?lat=-30.00&lon=20.00#horizon');
    await expect(view(page).getByRole('status')).toHaveText('No terrain covers this point on the server');
    await expect(view(page).getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(host(page).locator('canvas')).toHaveCount(0);
    expect(seen.filter((u) => /\/tiles\/[^?]+\/\d+\/-?\d+\/-?\d+/.test(u)).length).toBeLessThan(15);
  });

  // Verificador round 2 on PR #32: tiles that are only ever busy are a failure that may pass, not «no terrain».
  test('offers «Try again», not «no terrain», when every tile stays busy until its tries run out', async ({ page }) => {
    await page.clock.install({ time: AT });
    await stubApi(page);
    await stubTile(page, { tileStatus: 503, error: 'busy' });
    await page.goto('./?lat=-30.00&lon=20.00#horizon');
    const retry = view(page).getByRole('button', { name: 'Try again' });
    // The tries wait 2, 6 and 18 s, spread up to 1.5 times: the page's clock runs them out.
    await expect.poll(async () => {
      await page.clock.fastForward(30_000);
      return retry.count();
    }, { intervals: [50] }).toBe(1);
    await expect(view(page).getByRole('status')).toContainText('Terrain unavailable right now');
    await expect(view(page).getByRole('status')).not.toContainText('No terrain covers this point');
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the Horizon tab fills the screen with the ground in first person, the sheet at peek', async ({ page }) => {
    const requests: string[] = [];
    const scripts = collectScripts(page);
    await open(page, { path: `./${POINT}`, requests });
    await page.waitForLoadState('networkidle');
    expect(requests.filter((url) => VIEW_FILES.test(url))).toEqual([]);
    const first = await scripts.done();
    expect(carrying(first, PANEL_MARK)).toEqual([]);
    expect(carrying(first, SCENE_MARK)).toEqual([]);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
    await expect(page).toHaveURL(/#horizon$/);
    await settled(page);
    await firstPersonOnly(page);
    await expect(page.locator('.globe')).toBeHidden();
    await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 20 m');
    expect(requests.filter((url) => MODEL_FILES.test(url))).toEqual([]);
    const still = await idle(page);
    await page.waitForTimeout(1500);
    expect(await frames(page)).toBe(still);
    await shot(page, 'synthetic-phone-first');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.globe')).toBeVisible();
    await expect(view(page)).toHaveCount(0);
    await expect.poll(() => lostContexts(page)).toBeGreaterThanOrEqual(1);
  });

  test('IM-2 on its real LOLA relief, in first person, the sheet at peek', async ({ page }) => {
    await open(page, { path: './?site=im2-athena', real: RIDGE_AT });
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
    await settled(page);
    await idle(page);
    await firstPersonOnly(page);
    await shot(page, 'phone-first');
  });

  // VENT-52 (qa of PR #32): at 200 % text the site pill overflowed and the ridge's label and the 100 m ring's were
  // drawn over each other. (The camera switch the top bar covered is gone since VENT-54.)
  test('at 200 % text the pill fits and no two labels overlap', async ({ page }) => {
    await open(page, { path: './?site=im2-athena', real: RIDGE_AT });
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' }).click();
    await settled(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const pill = page.locator('.site-pill');
    expect(await pill.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await idle(page);
    const boxes = await view(page).locator('.on-foot__label:not([hidden])').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()).map(({ left, top, right, bottom }) => ({ left, top, right, bottom })));
    expect(boxes.length).toBeGreaterThan(0);
    const pairs = boxes.flatMap((a, i) => boxes.slice(i + 1).map((b) => [a, b] as const));
    const overlapping = pairs.filter(([a, b]) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);
    expect(overlapping).toEqual([]);
    await shot(page, 'phone-200-first');
  });

  // VENT-51 A1: the phone stage fills the screen, so a notice centred on it sat under the sheet at half.
  test('a lost context at the sheet at half says so in the band over the sheet, both buttons pressable', async ({ page }) => {
    await open(page, { path: `./${POINT}&quality=medium#horizon` });
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'half');
    await settled(page);
    await loseContext(page);
    await expect(view(page).getByRole('status')).toContainText('Terrain unavailable right now');
    const words = view(page).locator('.on-foot__status p').first();
    const [wordsBox, sheetBox, barBox] = await Promise.all([
      words.boundingBox(), page.locator('.sheet').boundingBox(), page.locator('.phone-bar').boundingBox()]);
    expect(wordsBox?.y ?? -1).toBeGreaterThanOrEqual((barBox?.y ?? 0) + (barBox?.height ?? 0));
    expect((wordsBox?.y ?? 0) + (wordsBox?.height ?? 999)).toBeLessThanOrEqual(sheetBox?.y ?? 0);
    for (const name of ['Try again', 'Copy report']) {
      expect(await pressable(page, view(page).getByRole('button', { name })), name).toBe(true);
    }
    // There was room: the sheet stays where the visitor left it.
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'half');
    await shot(page, 'phone-lost-half');
    await view(page).getByRole('button', { name: 'Try again' }).tap();
    await expect(host(page)).toHaveAttribute('data-tier', 'low');
  });

  // VENT-51 A2: at 200 % text the top bar grows and the half sheet rises to full, leaving no band: the sheet drops to
  // peek so the notice shows.
  test('a lost context at 200 % text in Spanish drops the sheet to peek so the notice and its buttons show', async ({ page }) => {
    // The sheet moves without its spring, so each of its moves costs one frame of the view, not a second's worth.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, { path: `./es/${POINT}&quality=medium#horizon` });
    // The view's names are Spanish here, so it is found by its classes.
    const stage = page.locator('.on-foot__host');
    await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    // A frame of the rings costs seconds in software GL: the sheet's rise is timed once they are built.
    await idle(page, stage);
    const sheet = page.locator('.sheet');
    const sheetAt = () => sheet.evaluate((el) => ({ top: el.getBoundingClientRect().top, moving: el.hasAttribute('data-moving') }));
    const before = (await sheetAt()).top;
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    // The half sheet rises for the grown summary: waits until it has risen and come to rest.
    await expect.poll(async () => {
      const now = await sheetAt();
      return !now.moving && now.top < before;
    }).toBe(true);
    await expect(sheet).toHaveAttribute('data-detent', 'half');
    await stage.locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await expect(page.locator('.on-foot__status')).toContainText('Terreno no disponible ahora');
    await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'peek');
    for (const name of ['Reintentar', 'Copiar informe']) {
      const button = page.locator('.on-foot__status').getByRole('button', { name });
      await expect.poll(() => pressable(page, button), { message: name }).toBe(true);
    }
    // The half sheet had risen to full, so the scrim was dark; at peek it clears, or the notice reads at half contrast.
    await expect.poll(() => page.locator('.phone-scrim').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await shot(page, 'phone-lost-es-200');
  });
});

// VENT-49 part 2: the lost state's second button in the longest text (the pseudo-locale is about 40 % longer) on the
// narrowest phone the layout promises: both buttons stay on the screen, 44 px tall, and nothing scrolls sideways.
test.describe('phone, 360x740, pseudo-locale', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('the lost state fits: «Try again» and «Copy report» wrap inside the screen, with no sideways scroll', async ({ page }) => {
    await open(page, { path: `./en-xa/${POINT}&quality=medium` });
    // The Horizon tab is the fourth of five (Globe, Calendar, DSN, Horizon, Sites); it leaves the sheet at peek.
    await page.locator('.tab-bar button').nth(3).tap();
    const stage = page.locator('.on-foot__host');
    await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    await stage.locator('canvas').evaluate((canvas) => {
      (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    const retry = page.locator('.on-foot__status .on-foot__retry');
    const copy = page.locator('.on-foot__status .on-foot__copy');
    await expect(copy).toBeVisible();
    for (const button of [retry, copy]) {
      const box = await button.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 999)).toBeLessThanOrEqual(360);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await shot(page, 'lost-state-phone-xa');
  });
});
