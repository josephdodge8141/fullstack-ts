import assert from 'node:assert/strict';
import test from 'node:test';

import { TestStepResultStatus, type Envelope } from '@cucumber/messages';

import { parseBehaviorSources } from './catalog.js';
import { LayerResultValidationError, normalizeLayerResults } from './layer-results.js';
import { runCucumberMessages } from './runtime-test-helper.js';

const applicationSource = `Feature: Application behavior
  @id:app.one
  Scenario: First behavior
    Given one behavior

  @id:app.two
  Scenario: Second behavior
    Given another behavior
`;
const factorySource = `Feature: Factory behavior
  @id:factory.one @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: First factory behavior
    backend-noop: Factory behavior has no backend application surface.
    frontend-noop: Factory behavior has no frontend application surface.
    browser-noop: Factory behavior has no browser application surface.
    Given first factory behavior

  @id:factory.two @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Second factory behavior
    backend-noop: Factory behavior has no backend application surface.
    frontend-noop: Factory behavior has no frontend application surface.
    browser-noop: Factory behavior has no browser application surface.
    Given second factory behavior
`;
const catalog = parseBehaviorSources([
  { category: 'application', uri: 'application/sample.feature', data: applicationSource },
  { category: 'factory', uri: 'factory/sample.feature', data: factorySource },
]);

test('application normalization returns an exact disjoint exercised and declared no-op partition', async () => {
  const envelopes = await runCucumberMessages({ 'application/sample.feature': applicationSource });
  const result = normalizeLayerResults(catalog, 'backend', envelopes);

  assert.deepEqual(
    result.exercised.map((entry) => entry.caseId),
    ['app.one', 'app.two'],
  );
  assert.deepEqual(result.noops, [
    {
      caseId: 'factory.one',
      reason: 'Factory behavior has no backend application surface.',
    },
    {
      caseId: 'factory.two',
      reason: 'Factory behavior has no backend application surface.',
    },
  ]);
  assert.deepEqual(result.counts, { expected: 4, exercised: 2, noop: 2 });
});

test('factory normalization uses factoryApplicable and represents other catalog cases as no-ops', async () => {
  const envelopes = await runCucumberMessages({ 'factory/sample.feature': factorySource });
  const result = normalizeLayerResults(catalog, 'factory', envelopes);

  assert.deepEqual(
    result.exercised.map((entry) => entry.caseId),
    ['factory.one', 'factory.two'],
  );
  assert.deepEqual(
    result.noops.map((entry) => entry.caseId),
    ['app.one', 'app.two'],
  );
  assert.deepEqual(result.counts, { expected: 4, exercised: 2, noop: 2 });
});

test('factory omission, duplication, extra cases, and non-passing status are rejected', async () => {
  const missing = await runCucumberMessages({
    'factory/sample.feature': factorySource.replace(/\n  @id:factory\.two[\s\S]*$/, '\n'),
  });
  const valid = await runCucumberMessages({ 'factory/sample.feature': factorySource });
  const extra = await runCucumberMessages({
    'factory/sample.feature': `${factorySource}
  @id:factory.extra @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Unexpected factory behavior
    backend-noop: Factory behavior has no backend application surface.
    frontend-noop: Factory behavior has no frontend application surface.
    browser-noop: Factory behavior has no browser application surface.
    Given unexpected factory behavior
`,
  });
  const failed = replaceFirstStepStatus(valid, TestStepResultStatus.FAILED);

  for (const input of [missing, [...valid, ...valid], extra, failed]) {
    assert.throws(() => normalizeLayerResults(catalog, 'factory', input));
  }
});

test('undefined, ambiguous, pending, skipped, unknown, and failed results are rejected', async () => {
  const envelopes = await runCucumberMessages({ 'application/sample.feature': applicationSource });
  const invalidStatuses = [
    TestStepResultStatus.UNDEFINED,
    TestStepResultStatus.AMBIGUOUS,
    TestStepResultStatus.PENDING,
    TestStepResultStatus.SKIPPED,
    TestStepResultStatus.UNKNOWN,
    TestStepResultStatus.FAILED,
  ] as const;

  for (const status of invalidStatuses) {
    assert.throws(
      () => normalizeLayerResults(catalog, 'backend', replaceFirstStepStatus(envelopes, status)),
      (error: unknown) =>
        error instanceof LayerResultValidationError && error.message.includes(status),
    );
  }
});

function replaceFirstStepStatus(
  envelopes: readonly Envelope[],
  status: TestStepResultStatus,
): readonly Envelope[] {
  let replaced = false;
  return envelopes.map((envelope) => {
    if (replaced || envelope.testStepFinished === undefined) {
      return envelope;
    }
    replaced = true;
    return {
      testStepFinished: {
        ...envelope.testStepFinished,
        testStepResult: { ...envelope.testStepFinished.testStepResult, status },
      },
    };
  });
}
