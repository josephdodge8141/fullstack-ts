import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authPrincipalSchema,
  authSessionSchema,
  browserReportSchema,
  errorResponseSchema,
  healthResponseSchema,
  loginRequestSchema,
  signupRequestSchema,
} from '../index.js';
import { authCallbackStateSchema, authProviderTokenSetSchema } from '../server.js';

test('the health contract accepts only the exact public response', () => {
  assert.deepEqual(healthResponseSchema.parse({ status: 'ok' }), { status: 'ok' });
  assert.equal(healthResponseSchema.safeParse({ status: 'healthy' }).success, false);
  assert.equal(healthResponseSchema.safeParse({ status: 'ok', database: 'up' }).success, false);
});

test('error, principal, and session contracts reject accidental wire fields', () => {
  const principal = authPrincipalSchema.parse({
    subject: 'preview-user-123',
    email: 'person@example.test',
    emailVerified: false,
  });

  assert.equal(authSessionSchema.safeParse({ authenticated: true, principal }).success, true);
  assert.equal(authSessionSchema.safeParse({ authenticated: false, principal }).success, false);
  assert.equal(
    errorResponseSchema.safeParse({
      error: {
        code: 'INVALID_INPUT',
        message: 'The request was invalid',
        details: [{ path: ['email'], message: 'Required', code: 'invalid_type' }],
        stack: 'must not cross the transport boundary',
      },
    }).success,
    false,
  );
});

test('auth input contracts apply strict email and password requirements', () => {
  const valid = { email: 'person@example.test', password: 'long-enough-secret' };

  assert.equal(loginRequestSchema.safeParse(valid).success, true);
  assert.equal(signupRequestSchema.safeParse(valid).success, true);
  assert.equal(signupRequestSchema.safeParse({ ...valid, email: 'invalid' }).success, false);
  assert.equal(signupRequestSchema.safeParse({ ...valid, password: 'short' }).success, false);
  assert.equal(signupRequestSchema.safeParse({ ...valid, role: 'admin' }).success, false);
});

test('server-only auth provider contracts validate callback state and token sets', () => {
  assert.equal(
    authCallbackStateSchema.safeParse({
      state: 'opaque-state-value',
      nonce: 'opaque-nonce-value',
      codeVerifier: 'x'.repeat(43),
      redirectUri: 'https://preview.example.test/api/v1/auth/callback',
      createdAtEpochMs: 1_800_000_000_000,
    }).success,
    true,
  );
  assert.equal(
    authProviderTokenSetSchema.safeParse({
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresInSeconds: 300,
      tokenType: 'Bearer',
    }).success,
    true,
  );
});

test('browser report syntax does not itself establish report success', () => {
  const parsed = browserReportSchema.parse({
    schemaVersion: 1,
    candidateSha: 'a'.repeat(40),
    deploymentGeneration: 'generation-7',
    workflowRunId: '4123',
    workflowRunAttempt: 2,
    capturedEvidence: [],
    cases: [
      {
        caseId: 'public.hello',
        outcome: 'uncertain',
        reason: 'The page did not settle before the deadline',
        evidenceRefs: [],
      },
    ],
  });

  assert.equal(parsed.cases[0]?.outcome, 'uncertain');
});
