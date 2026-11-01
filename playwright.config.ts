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

export default defineConfig({
  testDir: 'tests/e2e',
  // The self-hosted runners are shared with Mooner's CI: four workers each
  // leave headroom for two suites and a build on one machine (agreed
  // 2026-11-01). Local runs keep Playwright's default.
  workers: process.env.CI ? 4 : undefined,
  use: {
    // The production build registers a service worker (VENT-28), which would answer the API before the specs' page
    // routes see it. Only pwa.spec.ts lets it run.
    serviceWorkers: 'block',
    baseURL: `http://localhost:${port}${base}/`,
    // The cloud container ships its own Chromium; CI installs Playwright's.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npm run preview -w @ventana/web -- --port ${port} --ignore-lock`,
    url: `http://localhost:${port}${base}/`,
    reuseExistingServer: !process.env.CI,
  },
});
