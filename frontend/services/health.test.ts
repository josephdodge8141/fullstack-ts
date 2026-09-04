import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchHealth } from './health.js';

test('fetchHealth returns the exact shared health response', async () => {
  let requestedUrl: string | undefined;
  const response = new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  const health = await fetchHealth({
    fetchImpl: async (input) => {
      requestedUrl = String(input);
      return response;
    },
  });

  assert.equal(requestedUrl, '/api/v1/health');
  assert.deepEqual(health, { status: 'ok' });
});

test('fetchHealth rejects HTTP failures and malformed responses', async () => {
  await assert.rejects(
    fetchHealth({
      fetchImpl: async () => new Response('unavailable', { status: 503 }),
    }),
    /Health request failed \(503\)/,
  );

  await assert.rejects(
    fetchHealth({
      fetchImpl: async () => new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }),
    }),
    /status/i,
  );
});

test('fetchHealth forwards cancellation to fetch', async () => {
  const controller = new AbortController();
  let signal: AbortSignal | null | undefined;

  await fetchHealth({
    signal: controller.signal,
    fetchImpl: async (_input, init) => {
      signal = init?.signal;
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    },
  });

  assert.equal(signal, controller.signal);
});
