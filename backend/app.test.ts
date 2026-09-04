import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { createApp } from './app.js';

const listenForTest = async (): Promise<{ baseUrl: string; close: () => Promise<void> }> => {
  const server = createApp().listen(0);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  const { port } = address as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
};

test('public health returns the exact shared response shape', async () => {
  const app = await listenForTest();
  try {
    const response = await fetch(`${app.baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await app.close();
  }
});

test('unknown routes return a safe typed error response', async () => {
  const app = await listenForTest();
  try {
    const response = await fetch(`${app.baseUrl}/api/v1/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  } finally {
    await app.close();
  }
});
