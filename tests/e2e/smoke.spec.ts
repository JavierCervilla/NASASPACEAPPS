import { expect, test } from '@playwright/test';

test('the built site serves under its base path and hydrates React', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ventana Lunar');
  await expect(page.getByTestId('countdown')).toContainText(/days? to launch|weekend is on/);
  expect(errors).toEqual([]);
});
