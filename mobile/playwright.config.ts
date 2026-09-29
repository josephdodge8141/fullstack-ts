import { defineConfig } from '@playwright/test';

const backendUrl = 'http://127.0.0.1:3300';
const expoUrl = 'http://localhost:8081';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 120_000,
  webServer: [
    {
      command: 'npm run start -w @app/backend',
      url: `${backendUrl}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: '3300',
        EXPO_WEB_ORIGIN: expoUrl,
      },
    },
    {
      command: 'npm run web -w @app/mobile -- --port 8081 --host localhost',
      url: expoUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, CI: '1', EXPO_PUBLIC_API_URL: backendUrl },
    },
  ],
  use: { baseURL: expoUrl },
});
