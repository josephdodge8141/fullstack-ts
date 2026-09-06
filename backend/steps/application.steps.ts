import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import { After, Before, Given, Then, When, setWorldConstructor, World } from '@cucumber/cucumber';

import { createApp } from '../app.js';
import type { Connections } from '../config/connections.js';
import type { Environment } from '../config/environment.js';
import { OidcCallbackError, type AuthConnection } from '../config/oidc.js';
import type { AuthCallbackState, AuthPrincipal } from '../models/auth.js';

const transaction: AuthCallbackState = {
  state: 'state-value-that-is-long-enough',
  nonce: 'nonce-value-that-is-long-enough',
  codeVerifier: 'v'.repeat(43),
  redirectUri: 'http://127.0.0.1/api/v1/auth/callback',
  createdAtEpochMs: 1_800_000_000_000,
};
const principal: AuthPrincipal = {
  subject: 'cucumber-user',
  email: 'cucumber@example.test',
  emailVerified: false,
  displayName: 'Cucumber User',
};

class BackendWorld extends World {
  baseUrl = '';
  cookie: string | undefined;
  response: Response | undefined;
  callbackCondition = 'valid';
  close: (() => Promise<void>) | undefined;

  async establish(mode: 'login' | 'signup'): Promise<void> {
    const start = await fetch(`${this.baseUrl}/api/v1/auth/${mode}`, { redirect: 'manual' });
    this.cookie = cookieFrom(start);
    this.response = await fetch(
      `${this.baseUrl}/api/v1/auth/callback?code=valid-code&state=${transaction.state}`,
      { headers: { Cookie: this.cookie }, redirect: 'manual' },
    );
    this.cookie = cookieFrom(this.response);
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.cookie !== undefined) headers.set('Cookie', this.cookie);
    this.response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    return this.response;
  }
}

setWorldConstructor(BackendWorld);

Before(async function (this: BackendWorld) {
  const auth: AuthConnection = {
    begin: async () => ({ redirectUrl: 'https://provider.example.test/authorize', transaction }),
    complete: async (callbackUrl, received) => {
      if (
        this.callbackCondition !== 'valid' ||
        received.state !== transaction.state ||
        new URL(callbackUrl).searchParams.get('state') !== transaction.state
      ) {
        throw new OidcCallbackError();
      }
      return principal;
    },
  };
  const connections: Connections = {
    auth,
    health: { getHealth: () => ({ status: 'ok' }) },
    close: async () => undefined,
    forceAbort: () => undefined,
  };
  const environment: Environment = {
    host: '127.0.0.1',
    port: 0,
    shutdownTimeoutMs: 1_000,
    publicOrigin: transaction.redirectUri.replace('/api/v1/auth/callback', ''),
    oidcIssuer: 'https://provider.example.test',
    oidcClientId: 'cucumber',
    sessionSecret: 'cucumber-session-secret-that-is-long-enough',
  };
  const server = createApp({ connections, environment }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  this.baseUrl = `http://127.0.0.1:${String(address.port)}`;
  this.close = async () => {
    server.close();
    await once(server, 'close');
  };
});

After(async function (this: BackendWorld) {
  await this.close?.();
});

Given('the public starter is running', function (this: BackendWorld) {
  assert.ok(this.baseUrl.startsWith('http://127.0.0.1:'));
});

Given('a unique synthetic preview account', function () {});
Given('a synthetic preview account already exists', function () {});

Given('I am signed in with a synthetic preview account', async function (this: BackendWorld) {
  await this.establish('login');
});

Given(
  'I retain a request that was authenticated by the current session',
  async function (this: BackendWorld) {
    assert.equal((await this.request('/api/v1/auth/protected')).status, 200);
  },
);

Given(
  'an authentication transaction with the following callback condition:',
  function (this: BackendWorld, table) {
    const condition = table.rowsHash()['condition'];
    assert.ok(condition !== undefined);
    this.callbackCondition = condition;
  },
);

Given('I am not signed in', function (this: BackendWorld) {
  this.cookie = undefined;
});

When('I complete signup with valid account details', async function (this: BackendWorld) {
  await this.establish('signup');
});

When("I log in with that account's valid credentials", async function (this: BackendWorld) {
  await this.establish('login');
});

When('I log out', async function (this: BackendWorld) {
  await this.request('/api/v1/auth/logout', { method: 'POST' });
});

When('the authentication callback is processed', async function (this: BackendWorld) {
  const start = await fetch(`${this.baseUrl}/api/v1/auth/login`, { redirect: 'manual' });
  this.cookie = cookieFrom(start);
  this.response = await fetch(
    `${this.baseUrl}/api/v1/auth/callback?code=invalid&state=${transaction.state}`,
    { headers: { Cookie: this.cookie }, redirect: 'manual' },
  );
});

When('I request the public health endpoint', async function (this: BackendWorld) {
  await this.request('/api/v1/health');
});

Then('I am signed in as that account', async function (this: BackendWorld) {
  const response = await this.request('/api/v1/auth/session');
  const body: unknown = await response.json();
  assert.deepEqual(body, { authenticated: true, principal });
});

Then(
  'the application reports an authenticated session for that account',
  async function (this: BackendWorld) {
    const body: unknown = await (await this.request('/api/v1/auth/session')).json();
    assert.deepEqual(body, { authenticated: true, principal });
  },
);

Then('the application reports no authenticated session', async function (this: BackendWorld) {
  const body: unknown = await (await this.request('/api/v1/auth/session')).json();
  assert.deepEqual(body, { authenticated: false, principal: null });
});

Then(
  'replaying the retained authenticated request is rejected',
  async function (this: BackendWorld) {
    assert.equal((await this.request('/api/v1/auth/protected')).status, 401);
  },
);

Then('protected access requires me to log in again', async function (this: BackendWorld) {
  assert.equal((await this.request('/api/v1/auth/protected')).status, 401);
});

Then('the callback is rejected', function (this: BackendWorld) {
  assert.equal(this.response?.status, 400);
});

Then('no authenticated session is created', async function (this: BackendWorld) {
  const body: unknown = await (await this.request('/api/v1/auth/session')).json();
  assert.deepEqual(body, { authenticated: false, principal: null });
});

Then('the response status is {int}', function (this: BackendWorld, status: number) {
  assert.equal(this.response?.status, status);
});

Then('the response body is exactly:', async function (this: BackendWorld, expected: string) {
  assert.deepEqual(await this.response?.json(), JSON.parse(expected));
});

function cookieFrom(response: Response): string {
  const value = response.headers.getSetCookie()[0]?.split(';', 1)[0];
  assert.ok(value !== undefined);
  return value;
}
