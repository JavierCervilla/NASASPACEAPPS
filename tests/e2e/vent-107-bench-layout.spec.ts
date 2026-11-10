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
 * The depth suite's panel, as QA found it on VENT-104 (VENT-107): at 200 % text on a phone every results row is
 * reached by scrolling the panel's body, the comparison of log against reversed included, and on desktop the running
 * strip leaves the on-foot view's caption in sight. The results come from a kept state, as a finished benchmark leaves
 * it, so no run is played for them.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;
const VARIANTS = ['split', 'log', 'reversed', 'reversed+shadows', 'linear+shadows', 'log+shadows'];

const panel = (page: Page) => page.getByRole('region', { name: 'Benchmark' });

/** A step's metrics at `fps`, as the factories of the unit tests make them. */
function step(id: string, fps: number) {
  return {
    id, ms: fps * 100, frames: { fps, p95Ms: 1000 / fps, worstMs: 2000 / fps, drawn: 10 }, longTasks: 1,
    longTaskMs: 10, contexts: 1, textureBytes: 0, textures: 3, heapBytes: 1, triangles: 1000, calls: 30, netBytes: 500,
    requests: 2, lost: 0, timedOut: false,
  };
}

/** A finished depth benchmark, one round. */
function doneDepth() {
  const results = VARIANTS.map((variant, i) => ({
    variant, run: 1, tier: 'medium', steps: [step('openView', 20), step('turnMinute', 50 - i * 5)],
    depth: { drawn: variant.startsWith('reversed') ? 'reversed' : 'log', bits: 24, reversed: variant.startsWith('reversed'),
      shadowMap: variant.endsWith('+shadows') },
  }));
  const header = {
    gpu: 'PowerVR D-Series DXT-48-1536 (a long GPU name, as phones report them)', userAgent: 'Mozilla/5.0 (Linux; Android 16) Chrome/142.0.0.0',
    viewport: '412 × 839 @ 2.625', screen: '412 × 915', tier: 'medium', script: 1, build: 'ab12cd34ef56',
    instant: '1967-03-19T12:00:00Z',
  };
  return { v: 1, suite: 'depth', runs: 1, fast: true, order: VARIANTS, next: VARIANTS.length, results, header };
}

/** A finger's swipe up from (x, y), as raw touch events: CDP's scroll gesture does not scroll in this Chromium. */
async function swipeUp(page: Page, x: number, y: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', at: number[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at.map((ty) => ({ x: Math.round(x), y: Math.round(ty) })) });
  await touch('touchStart', [y]);
  for (let d = 10; d <= 200; d += 10) await touch('touchMove', [y - d]);
  await touch('touchEnd', []);
}

test.describe('on a phone, 412x915', () => {
  test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

  test('at 200 % text every results row is reached by scrolling the panel\'s body', async ({ page }) => {
    await page.addInitScript((state) => {
      sessionStorage.setItem('ventana.bench', state);
      localStorage.setItem('ventana.pinHint', 'seen');
    }, JSON.stringify(doneDepth()));
    await stubApi(page);
    await page.goto('./?bench=depth');
    await expect(panel(page).getByRole('button', { name: 'Copy report' })).toBeFocused({ timeout: START_MS });
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    const body = panel(page).locator('.bench__body');
    const table = panel(page).getByRole('region', { name: 'Depth buffers, turning' });
    const rows = table.getByRole('row');
    await expect(rows).toHaveCount(VARIANTS.length + 1);
    // A finger's swipe up over the table scrolls the body, as on the phone.
    const box = (await table.boundingBox())!;
    await swipeUp(page, box.x + box.width / 2, box.y + 20);
    await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await table.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    for (const [i, name] of ['Run', ...VARIANTS].entries()) {
      const row = rows.nth(i);
      await row.evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
      const [r, b] = [await row.boundingBox(), await body.boundingBox()];
      expect(r && b, name).toBeTruthy();
      expect(r!.y, name).toBeGreaterThanOrEqual(b!.y - 0.5);
      expect(r!.y + r!.height, name).toBeLessThanOrEqual(b!.y + b!.height + 0.5);
    }
    for (const name of ['Copy report', 'Run again', 'Close']) {
      await expect(panel(page).getByRole('button', { name })).toBeInViewport({ ratio: 1 });
    }
    await page.screenshot({ path: test.info().outputPath('depth-results-200.png') });
    await expect(panel(page).locator('.bench__versus')).toContainText('Logarithmic vs reversed, no shadow map: 45.0 fps vs 40.0 fps · p95 22 ms vs 25 ms · worst 44 ms vs 50 ms');

  });
});

test.describe('on desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the running strip leaves the on-foot view\'s caption in sight', async ({ page }) => {
    test.setTimeout(3 * 60_000);
    await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
    await stubApi(page);
    await stubWall(page, 300, 330);
    await stubTile(page);
    await page.goto('./?bench=depth&benchFast');
    await panel(page).getByRole('button', { name: 'Start' }).click({ timeout: START_MS });
    const running = page.locator('.ventana-bench-panel[data-phase="running"]');
    await expect(running).toContainText('Turn for 60 s', { timeout: 2 * 60_000 });
    const caption = page.locator('.on-foot__caption');
    await expect(caption).toBeVisible();
    const [strip, cap] = [await running.boundingBox(), await caption.boundingBox()];
    const apart = !strip || !cap || strip.x + strip.width <= cap.x || cap.x + cap.width <= strip.x
      || cap.y + cap.height <= strip.y || strip.y + strip.height <= cap.y;
    await page.screenshot({ path: test.info().outputPath('desktop-strip.png') });
    expect(apart).toBe(true);
    await running.getByRole('button', { name: 'Stop' }).click();
  });
});
