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
 * The benchmark's depth suite (VENT-104): `?bench=depth` plays the on-foot view of IM-2 with each depth buffer, the
 * app's logarithmic one against the reversed one, both with the shadow map as the app has it (VENT-107), then the
 * reversed, the linear and last the logarithmic one with the shadow map forced, each run a clean page load, and ends on
 * log against reversed and a row per run. SwiftShader exposes EXT_clip_control,
 * so `reversed` draws reversed. The last run's context is lost on purpose while it turns, as the Pixel 10's would be:
 * a loss is a result, so its row says when and the benchmark still ends on its results. The relief is the stubbed
 * synthetic one of terrain-view.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

const START_MS = 30_000;
/** Five runs of the fast depth script in software GL, each opening the on-foot view once. */
const RUNS_MS = 8 * 60_000;

const panel = (page: Page) => page.getByRole('region', { name: 'Benchmark' });

/** Loses the on-foot view's WebGL context, as a GPU fault would. */
async function loseOnFootContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.on-foot__host canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
}

test.describe('on a phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('?bench=depth runs every depth buffer, keeps a lost context as a result, and reports each run', async ({ page, context }) => {
    test.setTimeout(RUNS_MS + 60_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
    await stubApi(page);
    await stubWall(page, 300, 330);
    await stubTile(page);
    await page.goto('./?bench=depth&benchFast');
    await expect(panel(page).getByRole('button', { name: 'Start' })).toBeFocused({ timeout: START_MS });
    await expect(panel(page).getByRole('button', { name: '1' })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel(page)).toContainText('Depth suite');
    await panel(page).getByRole('button', { name: 'Start' }).click();

    const running = page.locator('.ventana-bench-panel[data-phase="running"]');
    await expect(running).toContainText('Depth · log+shadows', { timeout: RUNS_MS });
    await expect(page).toHaveURL(/[?&]shadows=force/);
    await expect(running).toContainText('Turn for 60 s', { timeout: 2 * 60_000 });
    await loseOnFootContext(page);

    await expect(page.locator('.ventana-bench-panel[data-phase="results"]')).toBeVisible({ timeout: RUNS_MS });
    await expect(page).not.toHaveURL(/[?&](depth|shadows)=/);
    const table = panel(page).getByRole('region', { name: 'Depth buffers, turning' });
    await expect(table.getByRole('row')).toHaveCount(7);
    await expect(table.getByRole('row').nth(1)).toHaveAccessibleName(/^split Survived split \d+ no on /);
    await expect(table.getByRole('row').nth(2)).toHaveAccessibleName(/^log Survived log \d+ no /);
    await expect(table.getByRole('row').nth(3)).toHaveAccessibleName(/^reversed Survived reversed \d+ yes /);
    await expect(table.getByRole('row', { name: /^reversed\+shadows Survived reversed \d+ yes on / })).toBeVisible();
    await expect(table.getByRole('row', { name: /^linear\+shadows Survived linear \d+ no on / })).toBeVisible();
    await expect(panel(page).locator('.bench__versus'))
      .toHaveText(/^Logarithmic vs reversed, no shadow map: [\d.]+ fps vs [\d.]+ fps · p95 [\d.]+ ms vs [\d.]+ ms · worst /);
    await expect(table.getByRole('row', { name: /^log\+shadows Lost after [\d.]+ s of the turn log \d+ no on / }))
      .toBeVisible();

    await panel(page).getByRole('button', { name: 'Copy report' }).click();
    await expect(panel(page).getByRole('status')).toHaveText('Report copied');
    const report = await page.evaluate(() => navigator.clipboard.readText());
    expect(report).toMatch(/^GPU: \S/m);
    expect(report).toContain('Suite: depth (script v1). Runs: 1 round, order split log reversed reversed+shadows linear+shadows log+shadows (fast script)');
    expect(report).toMatch(/^log vs reversed, no shadow map: fps [\d.]+ vs [\d.]+ · p95Ms /m);
    expect(report).toMatch(/^reversed\+shadows: survived · depth reversed · \d+ bits · reversed buffer yes · shadow map on · fps \d/m);
    expect(report).toMatch(/^log\+shadows: lost after [\d.]+ s of the turn · depth log · /m);
    expect(report).toMatch(/^linear\+shadows1 turnMinute: .*timedOut=0$/m);
    expect(errors).toEqual([]);
  });
});
