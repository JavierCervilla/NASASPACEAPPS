import { defineConfig } from '@playwright/test';

const base = (process.env.SITE_BASE ?? '/').replace(/\/$/, '');
const port = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: `http://localhost:${port}${base}/`,
    // The cloud container ships its own Chromium; CI installs Playwright's.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npm run preview -- --port ${port} --ignore-lock`,
    url: `http://localhost:${port}${base}/`,
    reuseExistingServer: !process.env.CI,
  },
});
