import { test, expect } from '@playwright/test';

test('public landing page exposes Hello World and health status', async ({ page }) => {
  await page.route('**/api/v1/health', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    }),
  );

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute(
    'href',
    '/api/v1/auth/login',
  );
  await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute(
    'href',
    '/api/v1/auth/signup',
  );
  await expect(page.getByRole('status')).toHaveText('API status: ok');
});
