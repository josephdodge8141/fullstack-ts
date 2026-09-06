import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { createApp } from './app.js';
import { createConnections, type Connections } from './config/connections.js';
import { OidcCallbackError, type AuthConnection } from './config/oidc.js';
import type { AuthCallbackState } from './models/auth.js';

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

test('the backend establishes and destroys a server session through its OIDC boundary', async () => {
  const transaction: AuthCallbackState = {
    state: 'state-value-that-is-long-enough',
    nonce: 'nonce-value-that-is-long-enough',
    codeVerifier: 'v'.repeat(43),
    redirectUri: 'http://app.localhost:8088/api/v1/auth/callback',
    createdAtEpochMs: 1_800_000_000_000,
  };
  const auth: AuthConnection = {
    begin: async (mode) => ({
      transaction,
      redirectUrl: `https://provider.example.test/authorize?mode=${mode}`,
    }),
    complete: async (callbackUrl, receivedTransaction) => {
      const callback = new URL(callbackUrl);
      if (
        receivedTransaction.state !== transaction.state ||
        callback.searchParams.get('state') !== transaction.state ||
        callback.searchParams.get('code') !== 'valid-code'
      ) {
        throw new OidcCallbackError();
      }
      return {
        subject: 'preview-user-123',
        email: 'person@example.test',
        emailVerified: false,
        displayName: 'Preview Person',
      };
    },
  };
  const app = await listenForTest(makeConnections({ auth }));
  try {
    const anonymous = await fetch(`${app.baseUrl}/api/v1/auth/session`);
    assert.deepEqual(await anonymous.json(), { authenticated: false, principal: null });

    const signup = await fetch(`${app.baseUrl}/api/v1/auth/signup`, { redirect: 'manual' });
    assert.equal(signup.status, 302);
    assert.equal(
      signup.headers.get('location'),
      'https://provider.example.test/authorize?mode=signup',
    );
    const initialCookie = sessionCookie(signup);

    const callback = await fetch(
      `${app.baseUrl}/api/v1/auth/callback?code=valid-code&state=${transaction.state}`,
      { headers: { Cookie: initialCookie }, redirect: 'manual' },
    );
    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get('location'), '/');
    const authenticatedCookie = sessionCookie(callback);

    const authenticated = await fetch(`${app.baseUrl}/api/v1/auth/session`, {
      headers: { Cookie: authenticatedCookie },
    });
    assert.deepEqual(await authenticated.json(), {
      authenticated: true,
      principal: {
        subject: 'preview-user-123',
        email: 'person@example.test',
        emailVerified: false,
        displayName: 'Preview Person',
      },
    });
    const protectedResponse = await fetch(`${app.baseUrl}/api/v1/auth/protected`, {
      headers: { Cookie: authenticatedCookie },
    });
    assert.equal(protectedResponse.status, 200);

    const logout = await fetch(`${app.baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: authenticatedCookie },
    });
    assert.equal(logout.status, 204);
    const replay = await fetch(`${app.baseUrl}/api/v1/auth/protected`, {
      headers: { Cookie: authenticatedCookie },
    });
    assert.equal(replay.status, 401);
    assert.deepEqual(await replay.json(), {
      error: { code: 'AUTH_REQUIRED', message: 'Authentication is required' },
    });
  } finally {
    await app.close();
  }
});

test('the backend rejects callback state mismatches without creating a session', async () => {
  const auth: AuthConnection = {
    begin: async () => ({
      transaction: {
        state: 'state-value-that-is-long-enough',
        nonce: 'nonce-value-that-is-long-enough',
        codeVerifier: 'v'.repeat(43),
        redirectUri: 'http://app.localhost:8088/api/v1/auth/callback',
        createdAtEpochMs: 1_800_000_000_000,
      },
      redirectUrl: 'https://provider.example.test/authorize',
    }),
    complete: async () => {
      throw new OidcCallbackError();
    },
  };
  const app = await listenForTest(makeConnections({ auth }));
  try {
    const login = await fetch(`${app.baseUrl}/api/v1/auth/login`, { redirect: 'manual' });
    const rejected = await fetch(`${app.baseUrl}/api/v1/auth/callback?code=used&state=wrong`, {
      headers: { Cookie: sessionCookie(login) },
      redirect: 'manual',
    });
    assert.equal(rejected.status, 400);
    assert.deepEqual(await rejected.json(), {
      error: {
        code: 'AUTH_CALLBACK_REJECTED',
        message: 'Authentication callback was rejected',
      },
    });
    const session = await fetch(`${app.baseUrl}/api/v1/auth/session`, {
      headers: { Cookie: sessionCookie(login) },
    });
    assert.deepEqual(await session.json(), { authenticated: false, principal: null });
  } finally {
    await app.close();
  }
});

function sessionCookie(response: Response): string {
  const setCookie = response.headers.getSetCookie()[0];
  assert.ok(setCookie !== undefined, 'response did not establish a session cookie');
  const cookie = setCookie.split(';', 1)[0];
  assert.ok(cookie !== undefined);
  return cookie;
}
