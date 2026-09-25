import assert from 'node:assert/strict';
import test from 'node:test';

import {
  browserCaptureRegistrySchema,
  browserReportSchema,
  designSystemPreferenceSchema,
  errorResponseSchema,
  healthResponseSchema,
} from '../index.js';

test('the health contract accepts only the exact public response', () => {
  assert.deepEqual(healthResponseSchema.parse({ status: 'ok' }), { status: 'ok' });
  assert.equal(healthResponseSchema.safeParse({ status: 'healthy' }).success, false);
  assert.equal(healthResponseSchema.safeParse({ status: 'ok', database: 'up' }).success, false);
});

test('error contracts reject accidental wire fields', () => {
  assert.equal(
    errorResponseSchema.safeParse({
      error: { code: 'INVALID_INPUT', message: 'Invalid', stack: 'private' },
    }).success,
    false,
  );
});

test('browser report syntax does not itself establish report success', () => {
  const parsed = browserReportSchema.parse({
    schemaVersion: 1,
    candidateSha: 'a'.repeat(40),
    deploymentGeneration: 'generation-7',
    workflowRunId: '4123',
    workflowRunAttempt: 2,
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
  assert.equal(
    browserReportSchema.safeParse({
      ...parsed,
      capturedEvidence: [{ id: 'model-owned-evidence' }],
    }).success,
    false,
  );
});

test('trusted browser captures bind immutable evidence metadata to one execution identity', () => {
  const identity = {
    candidateSha: 'a'.repeat(40),
    deploymentGeneration: 'generation-7',
    workflowRunId: '4123',
    workflowRunAttempt: 2,
  };
  const parsed = browserCaptureRegistrySchema.parse({
    schemaVersion: 1,
    captures: [
      {
        id: 'observation-1',
        ...identity,
        kind: 'accessibility',
        redacted: true,
        locator: 'workflow-artifact://browser-captures/observation-1.json',
        contentDigest: `sha256:${'b'.repeat(64)}`,
      },
    ],
  });

  assert.equal(parsed.captures[0]?.candidateSha, identity.candidateSha);
  assert.equal(
    browserCaptureRegistrySchema.safeParse({
      schemaVersion: 1,
      captures: [{ ...parsed.captures[0], content: 'actual observation stays outside metadata' }],
    }).success,
    false,
  );
});

test('design system preferences accept only known slots and color modes', () => {
  assert.deepEqual(designSystemPreferenceSchema.parse({ preset: 'ds-04', mode: 'system' }), {
    preset: 'ds-04',
    mode: 'system',
  });
  assert.equal(
    designSystemPreferenceSchema.safeParse({ preset: 'ds-21', mode: 'dark' }).success,
    false,
  );
  assert.equal(
    designSystemPreferenceSchema.safeParse({ preset: 'ds-01', mode: 'sepia' }).success,
    false,
  );
  assert.equal(
    designSystemPreferenceSchema.safeParse({ preset: 'ds-01', mode: 'dark', extra: true }).success,
    false,
  );
});
