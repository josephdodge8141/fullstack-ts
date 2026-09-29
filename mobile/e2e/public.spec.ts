import { expect, test } from '@playwright/test';

test('Expo renders the shared Hello World app and uses the shared backend', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('API status: ok');
  const loadedFonts = await page.evaluate(async () => {
    const faces = await document.fonts.load('400 16px "Geist Variable"');
    return faces.length;
  });
  expect(loadedFonts).toBeGreaterThan(0);
});
