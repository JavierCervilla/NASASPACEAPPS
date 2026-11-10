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
 * The split depth (VENT-114): two passes of linear depth draw the view as the logarithmic buffer does, so a PowerVR can
 * keep its shadow map without the far ridges stepping. On IM-2's recorded relief at the high tier the two draws are
 * compared band by band, mainly the skyline's, where a 24-bit linear depth over 190 km would show stairs; the split
 * view reaches rest with its shadow map on, draws more calls than the single pass but no more triangles, and with
 * `?depth=log` still draws as before. `VENT114_SHOTS=<dir>` saves both screenshots and the timing of a frame.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';

const START_MS = 40_000;
const SHOTS = process.env.VENT114_SHOTS;
const DAY = new Date('2026-11-22T00:00:00Z');
/** Mean absolute difference (0 to 255) the skyline band may differ by between the two depths. */
const MEAN_TOLERANCE = 6;
/** Share of the band's pixels that may differ by more than {@link PIXEL_JUMP}: silhouettes move by a texel or two. */
const OUTLIER_SHARE = 0.03;
const PIXEL_JUMP = 64;

const host = (page: Page) => page.locator('.on-foot__host');

interface Drawn {
  readonly png: Buffer;
  readonly draws: string;
  readonly shadows: number;
  readonly frameMs: number;
  readonly errors: readonly string[];
}

/** Opens IM-2's real relief at the high tier with `query`; its canvas alone, and what the host says. */
async function open(page: Page, query: string): Promise<Drawn> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(DAY);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  await stubApi(page);
  await stubRealRelief(page);
  await page.goto(`./?site=im2-athena&quality=high${query}#horizon`);
  await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
  await expect(host(page)).toHaveAttribute('data-working', 'false', { timeout: START_MS });
  await page.addStyleTag({ content: '.on-foot__host > :not(canvas) { visibility: hidden !important; }' });
  const draws = (await host(page).getAttribute('data-draws')) ?? '';
  const shadows = Number(await host(page).getAttribute('data-shadows'));
  const png = await host(page).locator('canvas').screenshot();
  const frameMs = SHOTS ? await turnMs(page) : 0;
  return { png, draws, shadows, frameMs, errors };
}

/** The median milliseconds from an arrow key to the frame it draws, over twelve turns (software GL: CPU = GPU). */
async function turnMs(page: Page): Promise<number> {
  await host(page).focus();
  const times: number[] = [];
  for (let k = 0; k < 12; k += 1) {
    const frames = Number(await host(page).getAttribute('data-frames'));
    const start = Date.now();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Number(await host(page).getAttribute('data-frames')), { intervals: [5] })
      .toBeGreaterThan(frames);
    times.push(Date.now() - start);
  }
  return times.sort((a, b) => a - b)[6] ?? 0;
}

/** The mean difference and the share of outliers between two screenshots over the rows `from` to `to` (0 to 1). */
async function bandDiff(a: Buffer, b: Buffer, from: number, to: number) {
  const read = async (png: Buffer) => {
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, ...info };
  };
  const [x, y] = [await read(a), await read(b)];
  expect([x.width, x.height]).toEqual([y.width, y.height]);
  const start = Math.floor(from * x.height) * x.width * x.channels;
  const end = Math.floor(to * x.height) * x.width * x.channels;
  let sum = 0;
  let outliers = 0;
  for (let i = start; i < end; i += x.channels) {
    const d = Math.max(...[0, 1, 2].map((c) => Math.abs((x.data[i + c] ?? 0) - (y.data[i + c] ?? 0))));
    sum += d;
    if (d > PIXEL_JUMP) outliers += 1;
  }
  const pixels = (end - start) / x.channels;
  return { mean: sum / pixels, outliers: outliers / pixels };
}

test.describe.serial('the split depth on IM-2\'s recorded relief', () => {
  let log: Drawn;
  let split: Drawn;

  test('the single-pass logarithmic depth draws as before', async ({ page }) => {
    log = await open(page, '&depth=log');
    expect(log.errors).toEqual([]);
    expect(log.shadows).toBeGreaterThan(0);
    await expect(host(page)).toHaveAttribute('data-depth', 'log');
  });

  test('the split depth reaches rest with its shadow map on and draws the skyline as the logarithmic one does', async ({ page }) => {
    split = await open(page, '');
    expect(split.errors).toEqual([]);
    expect(split.shadows).toBeGreaterThan(0);
    await expect(host(page)).toHaveAttribute('data-depth', 'split');
    const skyline = await bandDiff(log.png, split.png, 0.3, 0.7);
    expect(skyline.mean).toBeLessThan(MEAN_TOLERANCE);
    expect(skyline.outliers).toBeLessThan(OUTLIER_SHARE);
    const whole = await bandDiff(log.png, split.png, 0, 1);
    expect(whole.mean).toBeLessThan(MEAN_TOLERANCE);
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true });
      writeFileSync(`${SHOTS}/vent114-split-skyline.png`, split.png);
      writeFileSync(`${SHOTS}/vent114-log-skyline.png`, log.png);
      writeFileSync(`${SHOTS}/vent114-stats.json`, JSON.stringify({ log: { draws: log.draws, frameMs: log.frameMs },
        split: { draws: split.draws, frameMs: split.frameMs }, skyline, whole }, null, 2));
    }
  });

  test('the split draw counts both passes, and no more triangles than one pass plus the level it draws twice', () => {
    const [logCalls, logTriangles] = log.draws.split(',').map(Number) as [number, number];
    const [splitCalls, splitTriangles] = split.draws.split(',').map(Number) as [number, number];
    expect(splitCalls).toBeGreaterThanOrEqual(logCalls - 2);
    expect(splitTriangles).toBeLessThanOrEqual(logTriangles * 1.05);
  });
});
