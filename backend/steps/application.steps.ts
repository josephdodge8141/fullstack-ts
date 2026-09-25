import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import { After, Before, Given, Then, When, setWorldConstructor, World } from '@cucumber/cucumber';

import { createApp } from '../app.js';
import type { Connections } from '../config/connections.js';

class BackendWorld extends World {
  baseUrl = '';
  response: Response | undefined;
  close: (() => Promise<void>) | undefined;
}

setWorldConstructor(BackendWorld);

Before(async function (this: BackendWorld) {
  const connections: Connections = {
    health: { getHealth: () => ({ status: 'ok' }) },
    close: async () => undefined,
    forceAbort: () => undefined,
  };
  const server = createApp({ connections }).listen(0, '127.0.0.1');
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

Given('I am not signed in', function () {});

When('I request the public health endpoint', async function (this: BackendWorld) {
  this.response = await fetch(`${this.baseUrl}/api/v1/health`);
});

When('I request the old authentication session endpoint', async function (this: BackendWorld) {
  this.response = await fetch(`${this.baseUrl}/api/v1/auth/session`);
});

Then('the response status is {int}', function (this: BackendWorld, status: number) {
  assert.equal(this.response?.status, status);
});

Then('the response body is exactly:', async function (this: BackendWorld, expected: string) {
  assert.ok(this.response !== undefined);
  assert.deepEqual(await this.response.json(), JSON.parse(expected));
});
