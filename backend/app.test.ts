import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { createApp } from './app.js';
import { createConnections, type Connections } from './config/connections.js';

const makeConnections = (overrides: Partial<Connections> = {}): Connections => ({
  ...createConnections(),
  ...overrides,
});

const listenForTest = async (
  connections: Connections = createConnections(),
): Promise<{ baseUrl: string; close: () => Promise<void> }> => {
  const server = createApp({ connections }).listen(0);
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

test('health is constructed from the config-owned outbound connection', async () => {
  let calls = 0;
  const connections = makeConnections({
    health: {
      getHealth: (): unknown => {
        calls += 1;
        return { status: 'ok' };
      },
    },
  });
  const app = await listenForTest(connections);
  try {
    const response = await fetch(`${app.baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(calls, 1);
  } finally {
    await app.close();
  }
});
