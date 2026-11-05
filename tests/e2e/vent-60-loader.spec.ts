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
 * The on-foot view's loader, B→A (VENT-60, the human's verdict on the canvas), against the recorded LOLA relief of IM-2
 * (fixtures/terrain-ring-im2/, 20 m, VENT-59) with the tiles held back in the stub and let through a few at a time:
 * the plan from above and the counts while the 18 near tiles land, the plan lying down and the skyline when they are
 * in, the hand-over to the rendered view (the skyline's Sun where the scene draws it), the far relief's chip, reduced
 * motion, the failure state, and no idle frames once loaded. On 22 November 2026 at 20:00 UTC IM-2 has the Sun 6.7° up
 * at 350° and the Earth 10.2° up at 325°; the view opens toward the Sun.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import { stubApi } from './api-stub';
import { idleCount } from './view-idle';

const AT = new Date('2026-11-22T20:00:00Z');
const START_MS = 30_000;
const FIXTURES = new URL('./fixtures/terrain-ring-im2/', import.meta.url);
const TILE = /\/api\/v1\/terrain\/tiles\/polar-south\/(\d+)\/(-?\d+)\/(-?\d+)/;
const SCENE_CHUNK = /\/_astro\/terrain-scene\.[^/]+\.js$/;
const SHOTS = process.env.VENT60_SHOTS;

/** What the stub holds back, and what it lets through. */
interface Gate {
  /** Lets the held requests whose URL `matches` through, at most `count`, in the order they were asked. */
  readonly release: (matches: RegExp, count?: number) => Promise<number>;
  /** From now on lets every request whose URL `matches` through at once. */
  readonly open: (matches: RegExp) => Promise<number>;
  /** How many times each URL was answered; a request the page aborted and asked again is answered once. */
  readonly answered: Map<string, number>;
}

const NEAR = /\/tiles\/polar-south\/[01]\//;
const FAR = /\/tiles\/polar-south\/[23]\//;
const LIST = /\/terrain\/tiles\?/;

/** Holds the ring list, its tiles and the scene's chunk until released; `tileStatus` answers every tile with an error. */
async function holdRelief(page: Page, tileStatus?: number): Promise<Gate> {
  const held: { url: string; request: Request; go: () => Promise<void> }[] = [];
  const opened: RegExp[] = [];
  const answered = new Map<string, number>();
  // A request held past the ring's silence watch (VENT-78: 4 s) is aborted by the page, which asks again: only the
  // live one may be released, or a release answers a request nobody waits for and nothing lands.
  const failed = new Set<Request>();
  page.on('requestfailed', (request) => failed.add(request));
  const answer = (route: Route, url: URL): Promise<void> => {
    const m = TILE.exec(url.pathname);
    if (m && tileStatus) return route.fulfill({ status: tileStatus, json: { error: 'busy' } });
    const name = m ? `tile-polar-south-${m[1]}-${m[2]}-${m[3]}.json` : 'ring.json';
    try {
      return route.fulfill({ body: readFileSync(new URL(name, FIXTURES), 'utf8'), contentType: 'application/json' });
    } catch {
      return route.fulfill({ status: 404, json: { error: 'no terrain data covers this point' } });
    }
  };
  const hold = (route: Route, go: () => Promise<void>): Promise<void> | undefined => {
    const url = route.request().url();
    const answer = (): Promise<void> => (answered.set(url, (answered.get(url) ?? 0) + 1), go());
    if (opened.some((re) => re.test(url))) return answer();
    held.push({ url, request: route.request(), go: answer });
    return undefined;
  };
  await page.route(/\/api\/v1\/terrain\/tiles/, (route) => hold(route, () => answer(route, new URL(route.request().url()))));
  await page.route(SCENE_CHUNK, (route) => hold(route, () => route.continue()));
  const release = async (matches: RegExp, count = Number.POSITIVE_INFINITY): Promise<number> => {
    for (const h of held.filter((h) => failed.has(h.request))) held.splice(held.indexOf(h), 1);
    const now = held.filter((h) => matches.test(h.url)).slice(0, count);
    for (const h of now) held.splice(held.indexOf(h), 1);
    await Promise.all(now.map((h) => h.go()));
    return now.length;
  };
  return { release, answered, open: async (matches) => (opened.push(matches), release(matches)) };
}

async function open(page: Page, path: string, tileStatus?: number): Promise<Gate> {
  if (tileStatus) await page.clock.install({ time: AT });
  else await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  const gate = await holdRelief(page, tileStatus);
  await page.goto(path);
  return gate;
}

/** Opens `query` and goes to the Horizon view as a person does: the header's tab, or the phone's (its sheet at peek). */
async function openView(page: Page, layout: 'desktop' | 'phone', query: string, tileStatus?: number): Promise<Gate> {
  const gate = await open(page, `./${query}`, tileStatus);
  const tabs = layout === 'phone'
    ? page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Horizon' })
    : page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' });
  await tabs.click();
  return gate;
}

const view = (page: Page) => page.getByRole('region', { name: 'On foot at the site' });
const host = (page: Page) => view(page).getByRole('application', { name: 'On foot at the site' });
const loader = (page: Page) => page.locator('.on-foot-loader');
const frames = async (page: Page): Promise<number> => Number(await host(page).getAttribute('data-frames'));

/** Waits until the view has drawn no frame for 600 ms and its slices are all run, and returns the count. */
const idle = (page: Page): Promise<number> => idleCount(host(page));

/** Releases the near tiles a few at a time, as the API would, waiting for each to be asked. */
async function releaseNear(page: Page, gate: Gate, count: number): Promise<void> {
  let left = count;
  while (left > 0) {
    await expect.poll(() => gate.release(NEAR, 1), { timeout: 10_000 }).toBe(1);
    left -= 1;
  }
}

/** The translate a body's mark is placed at on the loader, «x,y» px from the loader's top left. */
const markAt = (page: Page, body: 'sun' | 'earth') =>
  page.locator(`.loader-skyline .loader-body--${body}`).evaluate((el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return [m.m41, m.m42] as const;
  });

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

for (const [layout, use] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
] as const) {
  test.describe(`${layout}`, () => {
    test.use({ ...use, deviceScaleFactor: SHOTS ? 2 : 1 });

    test('the plan from above counts the near tiles as they land, and zooms out for the 8 km ones', async ({ page }) => {
      const gate = await openView(page, layout, '?site=im2-athena&quality=high');
      const status = loader(page).getByRole('status');
      await expect(status).toContainText('Finding the terrain tiles');
      await expect(status).toContainText('LOLA relief around the point');
      await expect(loader(page).locator('.loader-plan')).toBeVisible();
      await expect(loader(page).locator('.loader-body--sun')).toContainText('Sun 6.7°');
      await expect(loader(page).locator('.loader-body--earth')).toContainText('Earth 10.2°');
      await shot(page, `${layout}-1-list`);
      await expect.poll(() => gate.release(LIST)).toBe(1);
      await expect(status).toContainText('Terrain · 0 of 18 tiles');
      await expect(status).toContainText('Near relief · rings of 2 and 8 km');
      await expect(loader(page).locator('.loader-plan__edges polygon[data-fate="waiting"]')).toHaveCount(18);
      await expect(loader(page).locator('.loader-plan__label')).toHaveText('2 km tiles · 15.6 m');
      await releaseNear(page, gate, 5);
      await expect(status).toContainText('Terrain · 5 of 18 tiles');
      await expect(loader(page).locator('.loader-tile[data-shaded]')).toHaveCount(5);
      await expect(loader(page).locator('.loader-plan')).toHaveAttribute('data-zoom', 'near');
      const bar = () => loader(page).locator('.on-foot-loader__bar i').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
      await expect.poll(bar).toBeCloseTo(5 / 18, 2);
      await shot(page, `${layout}-2-near`);
      await releaseNear(page, gate, 9);
      await expect(status).toContainText('Terrain · 14 of 18 tiles');
      await expect(loader(page).locator('.loader-plan')).toHaveAttribute('data-zoom', 'out');
      await expect(loader(page).locator('.loader-plan__label')).toHaveText('8 km tiles · 62.5 m');
      await page.waitForTimeout(900);
      await shot(page, `${layout}-3-zoomed`);
      for (const [url, n] of gate.answered) expect(n, url).toBe(1);
    });

    test('with the near tiles in the plan lies down, the skyline shapes, and the scene takes over under it', async ({ page }) => {
      const gate = await openView(page, layout, '?site=im2-athena&quality=high');
      await expect.poll(() => gate.release(LIST)).toBe(1);
      await releaseNear(page, gate, 18);
      const status = loader(page).getByRole('status');
      await expect(status).toContainText('Shaping the ground');
      await expect(status).toContainText('18 of 18 tiles · building the 3D view');
      await expect(loader(page)).toHaveAttribute('data-phase', 'shaping');
      await expect(loader(page).locator('.loader-skyline__ridge')).toBeVisible();
      await expect(loader(page).locator('.loader-glint')).toHaveCount(2);
      await expect.poll(() => loader(page).locator('.loader-plan__tilt').evaluate((el) => {
        const style = getComputedStyle(el);
        return { opacity: Number(style.opacity), tilted: style.transform !== 'none' };
      })).toEqual({ opacity: 0, tilted: true });
      await shot(page, `${layout}-4-shaping`);
      const sun = await markAt(page, 'sun');
      const bandTop = await loader(page).evaluate((el) => el.getBoundingClientRect().top - (el.parentElement?.getBoundingClientRect().top ?? 0));
      await loader(page).evaluate((el) => {
        const seen: string[] = [];
        (window as unknown as { __phases: string[] }).__phases = seen;
        new MutationObserver(() => seen.push(el.dataset['phase'] ?? '')).observe(el, { attributeFilter: ['data-phase'] });
      });
      // The scene's chunk was held: let it through, and the view stands under the skyline.
      await expect.poll(() => gate.release(SCENE_CHUNK)).toBe(1);
      await expect.poll(() => frames(page), { timeout: START_MS }).toBeGreaterThan(0);
      await shot(page, `${layout}-5-handover`);
      // No jump: the skyline's Sun is where the scene draws it.
      const [x, y] = (await host(page).getAttribute('data-sun-at'))?.split(',').map(Number) ?? [];
      expect(Math.abs((x ?? 0) - sun[0])).toBeLessThan(2);
      expect(Math.abs((y ?? 0) - (sun[1] + bandTop))).toBeLessThan(2);
      await expect(loader(page)).toHaveCount(0);
      // It faded through the hand-over, not out of existence.
      expect(await page.evaluate(() => (window as unknown as { __phases: string[] }).__phases)).toEqual(['handover']);
      await expect(view(page).getByRole('status')).toHaveCount(0);
      // VENT-69: a phone never opens at high (phoneTier), and only high draws the fine relief, so its caption names LOLA alone.
      if (layout === 'desktop') await expect(view(page)).toContainText('Fine detail illustrative · relief LROC NAC DTM 4 m · LOLA 20 m beyond');
      else {
        await expect(view(page)).toContainText('Fine detail illustrative · relief LOLA 20 m');
        await expect(view(page)).not.toContainText('LROC NAC DTM');
      }
    });

    test('after the hand-over the far relief keeps landing under a discreet chip, which goes; then the view draws no idle frames', async ({ page }) => {
      const gate = await openView(page, layout, '?site=im2-athena&quality=medium');
      await gate.open(SCENE_CHUNK);
      await gate.open(LIST);
      await gate.open(NEAR);
      await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
      const chip = view(page).locator('.on-foot__far');
      await expect(chip).toHaveText('Far relief · 0 of 18 tiles');
      await expect(chip).not.toHaveAttribute('role');
      await expect.poll(() => gate.release(FAR, 6), { timeout: 10_000 }).toBe(6);
      await expect(chip).toHaveText('Far relief · 6 of 18 tiles');
      await shot(page, `${layout}-6-far`);
      await view(page).locator('.on-foot__top').evaluate((top) => {
        const said: string[] = [];
        (window as unknown as { __chip: string[] }).__chip = said;
        new MutationObserver(() => {
          const text = top.querySelector('.on-foot__far')?.textContent ?? '';
          if (said.at(-1) !== text) said.push(text);
        }).observe(top, { subtree: true, childList: true, characterData: true });
      });
      await gate.open(FAR);
      // The far rings build in software GL on a busy machine: as long as the view takes to stand (terrain-view.spec.ts).
      await expect(chip).toHaveCount(0, { timeout: START_MS });
      const said = await page.evaluate(() => (window as unknown as { __chip: string[] }).__chip);
      expect(said.slice(-2)).toEqual(['Far relief · 32 and 128 km in', '']);
      await expect(loader(page)).toHaveCount(0);
      const still = await idle(page);
      await page.waitForTimeout(1500);
      expect(await frames(page)).toBe(still);
      await shot(page, `${layout}-7-loaded`);
      for (const [url, n] of gate.answered) expect(n, url).toBe(1);
    });

    test('under reduced motion the plan fades without zoom, tilt or glint', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const gate = await openView(page, layout, '?site=im2-athena&quality=high');
      await expect.poll(() => gate.release(LIST)).toBe(1);
      await releaseNear(page, gate, 14);
      await expect(loader(page).locator('.loader-plan')).toHaveAttribute('data-zoom', 'out');
      expect(await loader(page).locator('.loader-plan__world').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
      await releaseNear(page, gate, 4);
      await expect(loader(page)).toHaveAttribute('data-phase', 'shaping');
      await expect.poll(() => loader(page).locator('.loader-plan__tilt').evaluate((el) => {
        const style = getComputedStyle(el);
        return { opacity: Number(style.opacity), transform: style.transform };
      })).toEqual({ opacity: 0, transform: 'none' });
      await expect(loader(page).locator('.loader-glint').first()).toBeHidden();
      await shot(page, `${layout}-8-reduced`);
    });
  });
}

test.describe('failure', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: SHOTS ? 2 : 1 });

  test('when every tile stays busy, the skyline and the sky stay, dimmed, under «Try again»', async ({ page }) => {
    const gate = await openView(page, 'phone', '?site=im2-athena&quality=high', 503);
    await gate.open(/./);
    const retry = view(page).getByRole('button', { name: 'Try again' });
    await expect.poll(async () => {
      await page.clock.fastForward(30_000);
      return retry.count();
    }, { intervals: [50] }).toBe(1);
    await expect(view(page).getByRole('status')).toHaveText(/Terrain unavailable right now/);
    await expect(loader(page)).toHaveAttribute('data-phase', 'failed');
    await expect(loader(page).locator('.loader-plan')).toHaveCount(0);
    await expect(loader(page).locator('.loader-skyline__ridge')).toBeVisible();
    await expect(loader(page).locator('.loader-body--sun')).toContainText('Sun 6.7°');
    await expect.poll(() => loader(page).locator('.loader-skyline__line').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeCloseTo(0.6, 2);
    await shot(page, 'phone-9-failed');
  });
});
