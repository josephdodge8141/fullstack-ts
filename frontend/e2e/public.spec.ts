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

test('bundled component catalog has an operable dialog and disabled action', async ({ page }) => {
  await page.goto('/components');
  await expect(page.getByRole('heading', { name: 'Component library' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unavailable action' })).toBeDisabled();
  await page.getByRole('button', { name: 'Open example dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Example dialog' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open example dialog' })).toBeFocused();
});

test('data workspace filters sorts and selects local rows', async ({ page }) => {
  await page.goto('/components/data');
  await expect(page.getByRole('heading', { name: 'Data workspace' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search records' }).fill('gamma');
  await expect(page.getByRole('row', { name: /Gamma/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Alpha/ })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search records' }).clear();
  await page.getByRole('button', { name: 'Sort by name' }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Alpha');
  await page.getByRole('checkbox', { name: 'Select Alpha' }).check();
  await expect(page.getByText('1 selected')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('row', { name: /Gamma/ })).toBeVisible();
});

test('organization patterns work from the keyboard', async ({ page }) => {
  await page.goto('/components/organization');
  await page.getByRole('treeitem', { name: 'Projects' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'Design files' })).toBeVisible();
  await page.getByRole('treeitem', { name: 'Design files' }).click();
  await expect(page.getByText('Selected: Design files')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select Available A' }).check();
  await page.getByRole('button', { name: 'Move selected right' }).click();
  await expect(page.getByRole('list', { name: 'Selected items' })).toContainText('Available A');
});

test('invalid date and narrow layout remain usable', async ({ page }) => {
  await page.goto('/components/inputs');
  await page.getByLabel('Appointment date').fill('2020-01-01');
  await expect(page.getByText('Date is outside the allowed range')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/components/layouts');
  await expect(page.getByRole('heading', { name: 'Workspace layouts' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('bundled page layouts cover common product surfaces', async ({ page }) => {
  await page.goto('/components/layout-gallery');
  for (const name of [
    'Marketing layout',
    'Documentation layout',
    'Dashboard layout',
    'Detail layout',
    'Editor layout',
    'Inbox layout',
    'Gallery layout',
    'Form layout',
    'Status layout',
  ]) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('reduced-motion preference removes action movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/components');
  const duration = await page
    .getByRole('button', { name: 'Open example dialog' })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration).toMatch(/0\.00001s|1e-05s|0s/);
});
