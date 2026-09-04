import assert from 'node:assert/strict';
import test from 'node:test';

import { TestStepResultStatus, type Envelope } from '@cucumber/messages';

import { parseBehaviorSources } from './catalog.js';
import { normalizeRuntimeEnvelopes } from './runtime-results.js';
import { LayerResultValidationError, normalizeLayerResults } from './layer-results.js';
import { runCucumberMessages } from './runtime-test-helper.js';

const outlineSource = `Feature: Runtime linkage
  Background: Shared setup
    Given shared setup

  @id:runtime.outline
  Scenario Outline: Execute row <value>
    Given behavior <value>

    Examples: Stable rows
      | case_id | value |
      | first   | one   |
      | second  | two   |
`;

const catalog = parseBehaviorSources([
  { category: 'application', uri: 'application/runtime.feature', data: outlineSource },
]);

test('complete cucumber-js UUID envelopes derive stable outline cases and include hooks and steps', async () => {
  const envelopes = await runCucumberMessages({ 'application/runtime.feature': outlineSource });
  const runtimePickleIds = envelopes.flatMap((envelope) =>
    envelope.pickle === undefined ? [] : [envelope.pickle.id],
  );

  assert.equal(runtimePickleIds.length, 2);
  assert.ok(runtimePickleIds.every((id) => /^[a-f0-9-]{36}$/.test(id)));
  const derived = normalizeRuntimeEnvelopes(envelopes);
  assert.deepEqual(derived, [
    { caseId: 'runtime.outline::first', status: 'PASSED' },
    { caseId: 'runtime.outline::second', status: 'PASSED' },
  ]);
  assert.deepEqual(normalizeLayerResults(catalog, 'backend', envelopes).counts, {
    expected: 2,
    exercised: 2,
    noop: 0,
  });
});

test('a caller cannot replace runtime envelopes with fabricated stable case claims', () => {
  assert.throws(
    () =>
      normalizeLayerResults(catalog, 'backend', [
        { caseId: 'runtime.outline::first', status: 'PASSED' },
        { caseId: 'runtime.outline::second', status: 'PASSED' },
      ]),
    (error: unknown) =>
      error instanceof LayerResultValidationError && /envelope|runtime/i.test(error.message),
  );
});

test('a failed hook or scenario step makes the derived case fail', async () => {
  const envelopes = await runCucumberMessages({ 'application/runtime.feature': outlineSource });
  const hookStepId = envelopes
    .flatMap((envelope) => (envelope.testCase === undefined ? [] : envelope.testCase.testSteps))
    .find((step) => step.hookId !== undefined)?.id;
  assert.ok(hookStepId);

  const failedHook = replaceStepStatus(envelopes, hookStepId, TestStepResultStatus.FAILED);
  assert.throws(
    () => normalizeLayerResults(catalog, 'backend', failedHook),
    (error: unknown) =>
      error instanceof LayerResultValidationError && error.message.includes('FAILED'),
  );

  const scenarioStepId = envelopes
    .flatMap((envelope) => (envelope.testCase === undefined ? [] : envelope.testCase.testSteps))
    .find((step) => step.pickleStepId !== undefined)?.id;
  assert.ok(scenarioStepId);
  const failedScenarioStep = replaceStepStatus(
    envelopes,
    scenarioStepId,
    TestStepResultStatus.FAILED,
  );
  assert.throws(() => normalizeLayerResults(catalog, 'backend', failedScenarioStep));
});

test('incomplete or duplicated runtime linkage fails closed', async () => {
  const envelopes = await runCucumberMessages({ 'application/runtime.feature': outlineSource });
  const withoutFinish = envelopes.filter((envelope) => envelope.testCaseFinished === undefined);

  assert.throws(() => normalizeLayerResults(catalog, 'backend', withoutFinish));
  assert.throws(() => normalizeLayerResults(catalog, 'backend', [...envelopes, ...envelopes]));
});

test('a retry is rejected even when a later attempt passes', async () => {
  const retrySource = `Feature: Retry aggregation
  @id:runtime.retry
  Scenario: A retrying case
    Given a flaky behavior
`;
  const retryCatalog = parseBehaviorSources([
    { category: 'application', uri: 'application/retry.feature', data: retrySource },
  ]);
  const envelopes = await runCucumberMessages(
    { 'application/retry.feature': retrySource },
    {
      retry: 1,
      supportBody: `let attempt = 0;
Before(function () { attempt += 1; });
After(function () {});
Given('a flaky behavior', function () {
  if (attempt === 1) throw new Error('first attempt failed');
});`,
    },
  );

  assert.equal(envelopes.filter((envelope) => envelope.testCaseStarted !== undefined).length, 2);
  assert.throws(
    () => normalizeLayerResults(retryCatalog, 'backend', envelopes),
    (error: unknown) =>
      error instanceof LayerResultValidationError && error.message.includes('retried'),
  );
});

function replaceStepStatus(
  envelopes: readonly Envelope[],
  testStepId: string,
  status: TestStepResultStatus,
): readonly Envelope[] {
  return envelopes.map((envelope) => {
    const finished = envelope.testStepFinished;
    if (finished === undefined || finished.testStepId !== testStepId) {
      return envelope;
    }
    return {
      testStepFinished: {
        ...finished,
        testStepResult: { ...finished.testStepResult, status },
      },
    };
  });
}
