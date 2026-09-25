import { test, expect } from '@playwright/test';

test('design system picker reskins the library and restores after reload', async ({ page }) => {
  await page.goto('/design-systems');
  await expect(page.getByRole('heading', { name: 'Design systems', level: 1 })).toBeVisible();
  const picker = page.getByRole('radiogroup', { name: 'Design system' });
  await expect(picker.getByRole('radio')).toHaveCount(20);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ds-01');

  const foundationPrimary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  );
  await picker.getByRole('radio', { name: 'Harbor', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ds-02');
  const harborPrimary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  );
  expect(harborPrimary).not.toBe(foundationPrimary);

  await page
    .getByRole('radiogroup', { name: 'Color mode' })
    .getByRole('radio', { name: 'Dark', exact: true })
    .check();
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ds-02');
  await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
});

test('portaled dialog inherits the chosen preset and returns focus', async ({ page }) => {
  await page.goto('/design-systems');
  await page
    .getByRole('radiogroup', { name: 'Design system' })
    .getByRole('radio', { name: 'Hearth', exact: true })
    .check();
  await page.getByRole('button', { name: 'Open preset dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Preset dialog' });
  await expect(dialog).toBeVisible();
  const [surface, expected] = await dialog.evaluate((element) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--popover)';
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return [getComputedStyle(element).backgroundColor, value];
  });
  expect(surface).toBe(expected);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open preset dialog' })).toBeFocused();
});

test('open slots and corrupt preferences fall back to the default preset', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'design-system-preference',
      JSON.stringify({ preset: 'ds-12', mode: 'light' }),
    );
  });
  await page.goto('/design-systems');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ds-01');
  await expect(
    page
      .getByRole('radiogroup', { name: 'Design system' })
      .getByRole('radio', { name: 'Open slot DS-12', exact: true }),
  ).toBeDisabled();
});

test('gallery has no horizontal overflow on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/design-systems');
  await expect(page.getByRole('heading', { name: 'Motion', level: 2 })).toBeAttached();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
