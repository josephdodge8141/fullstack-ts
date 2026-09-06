import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchAuthSession, logout } from './auth.js';

test('auth service validates session responses and sends same-origin credentials', async () => {
  let requestedUrl: string | undefined;
  let credentials: RequestCredentials | undefined;
  const session = await fetchAuthSession({
    fetchImpl: async (input, init) => {
      requestedUrl = String(input);
      credentials = init?.credentials;
      return new Response(
        JSON.stringify({
          authenticated: true,
          principal: {
            subject: 'preview-user',
            email: 'person@example.test',
            emailVerified: false,
          },
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(requestedUrl, '/api/v1/auth/session');
  assert.equal(credentials, 'same-origin');
  assert.equal(session.authenticated, true);

  await assert.rejects(
    fetchAuthSession({
      fetchImpl: async () => new Response(JSON.stringify({ authenticated: true }), { status: 200 }),
    }),
  );
});

test('logout accepts only the no-content response', async () => {
  let method: string | undefined;
  await logout({
    fetchImpl: async (_input, init) => {
      method = init?.method;
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(method, 'POST');

  await assert.rejects(
    logout({ fetchImpl: async () => new Response(null, { status: 200 }) }),
    /Logout request failed \(200\)/,
  );
});
