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
/**
 * The on-foot specs that stand IM-2's real relief at the high tier: their own
 * project, run with two workers (see below).
 */
const ONFOOT_SPECS = /(terrain-view|vent-98-binary-tiles|vent-100-lunar-night|vent-114-split-depth|vent-117-loader-film|vent-121-walk)\.spec\.ts$/;
/** The landing's spec (VENT-109): its own preview at the domain's root, beside the app's. */
const LANDING_SPECS = /landing\.spec\.ts$/;
const landingPort = port + 1;

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
  // with the depth suite's spec too (VENT-104). The heavy on-foot specs need
  // about 12 s of a loaded runner to reach rest, against idleCount's 15 s, and
  // failed it in about half the CI runs of 6 Nov (VENT-108: the same rate on
  // 172a05b and on main under the same load, none alone): `onfoot` runs them
  // with two workers between `app` and `bench`, the same specs and limits.
  projects: [
    { name: 'app', testIgnore: [BENCH_SPECS, ONFOOT_SPECS, LANDING_SPECS] },
    { name: 'landing', testMatch: LANDING_SPECS, use: { baseURL: `http://localhost:${landingPort}/` } },
    { name: 'onfoot', testMatch: ONFOOT_SPECS },
    { name: 'bench', testMatch: BENCH_SPECS },
  ],
  webServer: [
    {
      command: `npm run preview -w @ventana/web -- --port ${port} --ignore-lock`,
      url: `http://localhost:${port}${base}/`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run preview -w @ventana/landing -- --port ${landingPort} --ignore-lock`,
      url: `http://localhost:${landingPort}/`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
