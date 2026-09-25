import { test, expect } from '@playwright/test';

test('public landing page exposes Hello World and health status', async ({ page }) => {
  const healthResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/health'),
  );
  await page.goto('/');

  const healthResponse = await healthResponsePromise;
  expect(healthResponse.status()).toBe(200);
  await expect(healthResponse.json()).resolves.toEqual({ status: 'ok' });
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await expect(page.getByRole('link', { name: /sign up|log in|create account/i })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('API status: ok');
});
