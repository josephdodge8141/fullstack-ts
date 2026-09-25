import { defineConfig } from '@playwright/test';

const baseURL = process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/public.spec.ts',
  timeout: 30_000,
  use: { baseURL },
});
