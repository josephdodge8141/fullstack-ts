import { defineConfig } from '@playwright/test';

const baseURL = process.env.PREVIEW_BASE_URL;
if (baseURL === undefined || !baseURL.startsWith('https://')) {
  throw new Error('PREVIEW_BASE_URL must be an HTTPS URL');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/public.spec.ts',
  use: { baseURL },
});
