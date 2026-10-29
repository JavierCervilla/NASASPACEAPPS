import { expect, test } from '@playwright/test';

test('the built site serves the page and hydrates the React island', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ventana Lunar');

  // The countdown text is already in the server-rendered HTML, so it proves nothing about hydration.
  // Astro removes the island's `ssr` attribute only once React has hydrated it.
  const island = page.locator('astro-island:has([data-testid="countdown"])');
  await expect(island).toHaveCount(1);
  await expect(island).not.toHaveAttribute('ssr');
  await expect(page.getByTestId('countdown')).toContainText(/days? to launch|weekend is on/);
  expect(errors).toEqual([]);
});

test('the production build ships no dev tools', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ventana Lunar');
  // The performance readout (packages/web/src/devtools/) mounts only in dev or PUBLIC_PERF_HUD=1 builds.
  await expect(page.locator('[data-devtools]')).toHaveCount(0);
});
