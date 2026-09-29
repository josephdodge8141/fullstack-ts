import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');

test('canonical Cucumber cases pass against the Expo web app', async ({ page }) => {
  await page.goto('/components/data');
  await expect(page.getByRole('heading', { name: 'Data workspace' })).toBeVisible({
    timeout: 30_000,
  });
  await page.goto('/design-systems');
  await expect(page.getByRole('heading', { name: 'Design systems' })).toBeVisible({
    timeout: 30_000,
  });

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      '--import',
      'tsx',
      'packages/cucumber/catalog/run-layer.ts',
      'mobile',
      'frontend/steps/application.steps.ts',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        COMPOSE_BASE_URL: 'http://localhost:8081',
        APPLICATION_API_BASE_URL: 'http://127.0.0.1:3300',
      },
      maxBuffer: 1024 * 1024,
      timeout: 110_000,
    },
  );
  expect(stdout).toMatch(/mobile represented \d+ cases: \d+ passed, \d+ justified no-op/);
  console.log(stdout.trim());
});
