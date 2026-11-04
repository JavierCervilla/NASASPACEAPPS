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
 * One renderer for the on-foot view's whole life (VENT-69, after a Pixel 10 lost its GPU context when the point
 * changed in the Horizon view): a new point rebuilds the world on the same canvas and context, never makes a second
 * WebGL context while the first lives, and compiles no ground program again.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall, type TileStub } from './terrain-stub';

const AT = new Date('2026-11-30T20:00:00Z');
const START_MS = 30_000;
/** What only the ground's fragment shader carries (sun-mask.ts's per-vertex varying). */
const GROUND = 'vLit';

interface Probe {
  /** One entry per WebGL context ever made. */
  made: { id: number; lost: () => boolean; size: string; parent: string }[];
  peak: number;
  ground: number;
  links: number;
  /** GPU textures and buffers made and not deleted yet. */
  textures: number;
  buffers: number;
}

/** Counts the WebGL contexts the page makes (and how many live at once) and the ground programs it compiles. */
async function probe(page: Page): Promise<void> {
  await page.addInitScript((mark) => {
    const probe: Probe = { made: [], peak: 0, ground: 0, links: 0, textures: 0, buffers: 0 };
    (window as unknown as { __probe: Probe }).__probe = probe;
    const seen = new WeakSet<object>();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const gl = (getContext as (...args: unknown[]) => unknown).call(this, type, ...rest) as WebGL2RenderingContext | null;
      if (gl && /webgl/.test(type) && !seen.has(gl)) {
        seen.add(gl);
        probe.made.push({ id: probe.made.length, lost: () => gl.isContextLost(), size: `${this.width}x${this.height}`, parent: this.parentElement?.className ?? '(detached at make)' });
        probe.peak = Math.max(probe.peak, probe.made.filter((c) => !c.lost()).length);
      }
      return gl as never;
    } as typeof getContext;
    const proto = WebGL2RenderingContext.prototype;
    const source = proto.shaderSource;
    proto.shaderSource = function (this: WebGL2RenderingContext, shader: WebGLShader, text: string) {
      if (text.includes(mark) && text.includes('pc_fragColor')) probe.ground += 1;
      return source.call(this, shader, text);
    };
    const counted = (make: 'createTexture' | 'createBuffer', drop: 'deleteTexture' | 'deleteBuffer', key: 'textures' | 'buffers') => {
      const made = proto[make];
      proto[make] = function (this: WebGL2RenderingContext) {
        probe[key] += 1;
        return made.call(this);
      } as never;
      const dropped = proto[drop] as (this: WebGL2RenderingContext, thing: unknown) => void;
      proto[drop] = function (this: WebGL2RenderingContext, thing: unknown) {
        if (thing) probe[key] -= 1;
        return dropped.call(this, thing);
      } as never;
    };
    counted('createTexture', 'deleteTexture', 'textures');
    counted('createBuffer', 'deleteBuffer', 'buffers');
    const link = proto.linkProgram;
    proto.linkProgram = function (this: WebGL2RenderingContext, program: WebGLProgram) {
      probe.links += 1;
      return link.call(this, program);
    };
  }, GROUND);
}

const read = (page: Page) => page.evaluate(() => {
  const p = (window as unknown as { __probe: Probe }).__probe;
  return { made: p.made.length, alive: p.made.filter((c) => !c.lost()).length, peak: p.peak, ground: p.ground, links: p.links, textures: p.textures, buffers: p.buffers, list: p.made.map((c) => `${c.id}:${c.size}:${c.parent}:${c.lost() ? 'lost' : 'live'}`) };
});

/** The slices are all run: the shading of the rings and the rocks no longer add programs. */
async function settled(page: Page): Promise<void> {
  const host = page.getByRole('application', { name: 'On foot at the site' });
  await expect(host).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await page.waitForTimeout(1500);
  await expect(host).toHaveAttribute('data-working', 'false');
}

async function openView(page: Page, tiles: TileStub = {}, query = 'quality=medium'): Promise<void> {
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await probe(page);
  await stubApi(page);
  await stubTile(page, tiles);
  await stubWall(page, 100, 140);
  await page.goto(`./?site=im2-athena&${query}`);
  await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Horizon' }).click();
  const host = page.getByRole('application', { name: 'On foot at the site' });
  await expect(host).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect.poll(async () => Number(await host.getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(0);
}

test('a new point is built on the same renderer: no second context, no program compiled again', async ({ page }) => {
  await openView(page, {}, 'quality=low&onfoot=far');
  const host = page.getByRole('application', { name: 'On foot at the site' });
  const canvas = await host.locator('canvas').elementHandle();
  await settled(page);
  const before = await read(page);
  const framesBefore = Number(await host.getAttribute('data-frames'));
  await page.locator('.site-button').click();
  await page.locator('#site-popover').getByRole('button', { name: /Malapert/ }).first().click();
  await expect(page.locator('.site-button__name')).not.toHaveText('IM-2 Athena');
  await expect.poll(async () => Number(await host.getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(framesBefore);
  await expect(host).not.toHaveAttribute('data-parked', 'true', { timeout: START_MS });
  await expect(page.locator('.on-foot__status')).toHaveCount(0);
  await settled(page);
  const after = await read(page);
  expect(after.made, 'no WebGL context made for the new point').toBe(before.made);
  expect(after.alive, 'the view and the globe keep their contexts').toBe(before.alive);
  expect(after.ground, 'the ground program is not compiled again').toBe(before.ground);
  expect(after.links, 'no program is linked again').toBe(before.links);
  expect(await host.locator('canvas').elementHandle().then((h) => h!.evaluate((a, b) => a === b, canvas))).toBe(true);
});

// Low and the rings stopped at level 1 (`onfoot=far`): two rebuilds of the world are what this counts, and under four
// workers the medium tier's four levels, twice over, outlast the test's 30 s. The counts asserted are the same.
test('the point changes twice without a context or a program more', async ({ page }) => {
  await openView(page, {}, 'quality=low&onfoot=far');
  const host = page.getByRole('application', { name: 'On foot at the site' });
  await settled(page);
  const before = await read(page);
  for (const name of [/Malapert/, /IM-2/]) {
    const frames = Number(await host.getAttribute('data-frames'));
    await page.locator('.site-button').click();
    await page.locator('#site-popover').getByRole('button', { name }).first().click();
    await expect.poll(async () => Number(await host.getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(frames);
    await expect(host).not.toHaveAttribute('data-parked', 'true', { timeout: START_MS });
  }
  await settled(page);
  const after = await read(page);
  expect(after.made).toBe(before.made);
  expect(after.ground).toBe(before.ground);
});

test('while the next point\'s tiles load the parked view draws nothing and stays parked until its terrain draws', async ({ page }) => {
  const tiles: TileStub = {};
  await openView(page, tiles, 'quality=low&onfoot=far');
  // Parked, the host is hidden from the accessibility tree, so a role query would not find it.
  const host = page.locator('.on-foot__host');
  await settled(page);
  tiles.delayMs = 6000;
  await page.locator('.site-button').click();
  await page.locator('#site-popover').getByRole('button', { name: /Malapert/ }).first().click();
  await expect(host).toHaveAttribute('data-parked', 'true', { timeout: START_MS });
  const parkedAt = Number(await host.getAttribute('data-frames'));
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(500);
    await expect(host).toHaveAttribute('data-parked', 'true');
  }
  expect(Number(await host.getAttribute('data-frames')) - parkedAt, 'no frame of the old world under the loader').toBeLessThanOrEqual(1);
  tiles.delayMs = 0;
  await expect(host).not.toHaveAttribute('data-parked', 'true', { timeout: START_MS });
  expect(Number(await host.getAttribute('data-frames'))).toBeGreaterThan(parkedAt);
});

// VENT-64 and VENT-67 at high: the crater patch and the clod raster are built for each point and the old ones freed,
// so what the GPU holds does not grow across point changes, and the one context stays. One change: in software GL each
// rebuild takes several seconds and two outlast the test's 30 s under load. Rocks, shade and shadows are left out
// (`?onfoot=`) for the same reason; the layers under test are not.
test('at high the crater and clod layers rebuild for each point and free the old ones', async ({ page }) => {
  await openView(page, {}, 'quality=high&onfoot=far,rocks,shade,shadows');
  const host = page.getByRole('application', { name: 'On foot at the site' });
  const steps = (): Promise<string> => page.evaluate(() => sessionStorage.getItem('ventana.onFootReport') ?? '');
  const count = async (step: string): Promise<number> => (await steps()).split(step).length - 1;
  await expect.poll(() => count('clod relief baked'), { timeout: START_MS }).toBe(1);
  expect(await count('crater patch built')).toBe(1);
  await expect(host).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  const before = await read(page);
  const held: { textures: number; buffers: number }[] = [];
  for (const [i, name] of [/Malapert/].entries()) {
    const frames = Number(await host.getAttribute('data-frames'));
    await page.locator('.site-button').click();
    await page.locator('#site-popover').getByRole('button', { name }).first().click();
    await expect.poll(async () => Number(await host.getAttribute('data-frames')), { timeout: START_MS }).toBeGreaterThan(frames);
    await expect(host).not.toHaveAttribute('data-parked', 'true', { timeout: START_MS });
    await expect.poll(() => count('clod relief baked'), { timeout: START_MS }).toBe(i + 2);
    await expect.poll(() => count('crater patch built'), { timeout: START_MS }).toBeGreaterThanOrEqual(i + 2);
    await expect(host).toHaveAttribute('data-working', 'false', { timeout: START_MS });
    const now = await read(page);
    held.push({ textures: now.textures, buffers: now.buffers });
  }
  const after = await read(page);
  expect(await count('crater patch built'), 'a patch for each point').toBeGreaterThanOrEqual(2);
  expect(await count('clod relief baked'), 'a clod raster for each point').toBe(2);
  expect(after.made, 'no second context').toBe(before.made);
  expect(after.ground, 'no ground program compiled again').toBe(before.ground);
  // The clod raster of the old point was freed before the new one was made: no texture more than at the start.
  expect(held[0]!.textures, 'the old textures are freed').toBeLessThanOrEqual(before.textures);
  // The other point's own meshes make a buffer count that is not comparable with the start's; that the old crater
  // patch's geometry is disposed is held by tests/crater-patch.test.ts.
});
