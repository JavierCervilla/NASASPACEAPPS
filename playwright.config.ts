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

import { defineConfig } from '@playwright/test';

const base = (process.env.SITE_BASE ?? '/').replace(/\/$/, '');
// PW_PORT picks another port when 4321 is taken (another preview, a second checkout).
const port = Number(process.env.PW_PORT ?? 4321);
/** The benchmark's specs: its own project, run alone (see below). */
const BENCH_SPECS = /(vent-81-bench|vent-104-bench-depth)\.spec\.ts$/;

export default defineConfig({
  testDir: 'tests/e2e',
  // The self-hosted runners are shared with Mooner's CI: four workers each
  // leave headroom for two suites and a build on one machine (agreed
  // 2026-11-01). Local runs keep Playwright's default.
  ...(process.env.CI ? { workers: 4 } : {}),
  use: {
    // The production build registers a service worker (VENT-28), which would answer the API before the specs' page
    // routes see it. Only pwa.spec.ts lets it run.
    serviceWorkers: 'block',
    baseURL: `http://localhost:${port}${base}/`,
    // The cloud container ships its own Chromium; CI installs Playwright's.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  // The benchmark's spec drives whole scripted runs on software GL, about a
  // minute of full CPU: run alongside the suite it slowed other specs'
  // bounded waits (VENT-81: vent-60-loader's far chip missed its 5 s in two
  // CI runs while it ran). `npm run e2e` runs `app`, then `bench` alone,
  // with the depth suite's spec too (VENT-104).
  projects: [
    { name: 'app', testIgnore: BENCH_SPECS },
    { name: 'bench', testMatch: BENCH_SPECS },
  ],
  webServer: {
    command: `npm run preview -w @ventana/web -- --port ${port} --ignore-lock`,
    url: `http://localhost:${port}${base}/`,
    reuseExistingServer: !process.env.CI,
  },
});
