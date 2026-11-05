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
 * The benchmark (VENT-81): `?bench` loads its panel after the page has started, and nothing of it is asked for without
 * it. «Start» plays script v1 once as A and once as B, each run a clean page load (here `benchRuns=1` and the fast
 * script, `benchFast`, which scales the waits and turns down for software GL), and ends on the results, whose copied
 * report carries the header (the fixed instant, 19 March 1967 at noon UTC) and every step of both variants. The relief is
 * the stubbed synthetic one of terrain-view.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubTile, stubWall } from './terrain-stub';

/** The benchmark's chunk and styles (scripts/service-worker.mjs ON_DEMAND). */
const BENCH_FILES = /\/_astro\/(bench-boot[.-]|bench\.[^/]+\.css)/;
/** The dev tools' files: `?bench` alone loads none of them. */
const TOOL_FILES = /\/_astro\/(boot|perf-hud|spector)[.-]/;
/** After start (src/lib/after-start.ts) is 2 s at most after the page's scripts run. */
const AFTER_START_MS = 2000;
const START_MS = 30_000;
/** Two runs of the fast script in software GL, each opening the on-foot view twice. */
const RUNS_MS = 8 * 60_000;

const panel = (page: Page) => page.getByRole('region', { name: 'Benchmark' });

async function open(page: Page, path: string, requests: string[]): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  page.on('request', (request) => requests.push(request.url()));
  await stubApi(page);
  await stubWall(page, 300, 330);
  await stubTile(page);
  await page.goto(path);
  await expect(page.locator('.globe-markers')).toHaveAttribute('data-state', /\w/, { timeout: START_MS });
}

test('without ?bench, nothing of the benchmark is asked for', async ({ page }) => {
  const requests: string[] = [];
  await open(page, './', requests);
  await page.waitForTimeout(AFTER_START_MS + 1000);
  expect(requests.filter((url) => BENCH_FILES.test(url))).toEqual([]);
  await expect(page.locator('.ventana-bench-panel')).toHaveCount(0);
});

test('?bench shows the first state after start, with no dev tools, and «Close» leaves it', async ({ page }) => {
  const requests: string[] = [];
  await open(page, './?bench', requests);
  await expect(panel(page).getByRole('button', { name: 'Start' })).toBeVisible({ timeout: START_MS });
  await expect(panel(page).getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
  expect(requests.some((url) => BENCH_FILES.test(url))).toBe(true);
  expect(requests.filter((url) => TOOL_FILES.test(url))).toEqual([]);
  await panel(page).getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/\/\?site=im2-athena$|\/$/);
  await expect(page.locator('.ventana-bench-panel')).toHaveCount(0);
});

test('one run of each variant ends on the results, whose report has both variants and the header', async ({ page, context }) => {
  test.setTimeout(RUNS_MS + 60_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, './?bench&benchRuns=1&benchFast', []);
  await panel(page).getByRole('button', { name: 'Start' }).click();
  await expect(panel(page).getByText('Run A · globe kept')).toBeVisible({ timeout: START_MS });
  await expect(page.locator('.ventana-bench-panel[data-phase="results"]')).toBeVisible({ timeout: RUNS_MS });
  await expect(panel(page).getByRole('heading', { name: 'Benchmark done' })).toBeVisible();
  await expect(panel(page).getByRole('row', { name: /WebGL contexts alive 2 1 −1/ })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Copy report' }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Report copied');
  const report = await page.evaluate(() => navigator.clipboard.readText());
  expect(report).toContain('Script v1 · instant 1967-03-19T12:00:00Z');
  expect(report).toMatch(/^GPU: \S/m);
  expect(report).toMatch(/^View tier: (low|medium|high)$/m);
  expect(report).toContain('Runs: 1 per variant, order A B (fast script)');
  expect(report).toContain('turn contexts: A 2 · B 1');
  for (const id of ['globeIdle', 'globeMoves', 'openView', 'turn', 'changePoint', 'backToGlobe']) {
    expect(report).toMatch(new RegExp(`^A1 ${id}: .*timedOut=0$`, 'm'));
    expect(report).toMatch(new RegExp(`^B1 ${id}: .*timedOut=0$`, 'm'));
  }
});
