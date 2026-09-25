import { defineConfig } from '@playwright/test';

const inheritedEnvironment = Object.entries(process.env).reduce<Record<string, string>>(
  (environment, [name, value]) => {
    if (value !== undefined) environment[name] = value;
    return environment;
  },
  {},
);

const backendPort = process.env.E2E_BACKEND_PORT ?? '3300';
const frontendPort = process.env.E2E_FRONTEND_PORT ?? '4173';
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  webServer: [
    {
      command: 'npm run start -w @app/backend',
      url: `${backendUrl}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        ...inheritedEnvironment,
        HOST: '127.0.0.1',
        PORT: backendPort,
      },
    },
    {
      command: `npm run preview:test -- --host 127.0.0.1 --port ${frontendPort}`,
      url: frontendUrl,
      reuseExistingServer: false,
      env: {
        ...inheritedEnvironment,
        E2E_BACKEND_PORT: backendPort,
        E2E_FRONTEND_PORT: frontendPort,
      },
    },
  ],
  use: {
    baseURL: frontendUrl,
  },
});
