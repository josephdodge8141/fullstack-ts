import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBehaviorSources } from './catalog.js';
import { LayerResultValidationError, normalizeLayerResults } from './layer-results.js';

const catalog = parseBehaviorSources([
  {
    uri: 'application/sample.feature',
    data: `Feature: Application behavior
  @id:app.one
  Scenario: First behavior
    Given one behavior

  @id:app.two
  Scenario: Second behavior
    Given another behavior
`,
  },
  {
    uri: 'factory/sample.feature',
    data: `Feature: Factory behavior
  @id:factory.only @backend-noop @frontend-noop @browser-noop-eligible
  Scenario: Factory-only behavior
    backend-noop: Factory behavior has no backend application surface.
    frontend-noop: Factory behavior has no frontend application surface.
    browser-noop: Factory behavior has no browser application surface.
    Given factory behavior
`,
  },
]);

test('normalization returns an exact disjoint exercised and no-op partition', () => {
  const result = normalizeLayerResults(catalog, 'backend', [
    { caseId: 'app.one', status: 'PASSED' },
    { caseId: 'app.two', status: 'PASSED' },
  ]);

  assert.deepEqual(
    result.exercised.map((entry) => entry.caseId),
    ['app.one', 'app.two'],
  );
  assert.deepEqual(result.noops, [
    {
      caseId: 'factory.only',
      reason: 'Factory behavior has no backend application surface.',
    },
  ]);
  assert.deepEqual(result.counts, { expected: 3, exercised: 2, noop: 1 });
});

test('equal-size but different result sets are rejected with both differences', () => {
  assert.throws(
    () =>
      normalizeLayerResults(catalog, 'backend', [
        { caseId: 'app.one', status: 'PASSED' },
        { caseId: 'app.replacement', status: 'PASSED' },
      ]),
    (error: unknown) =>
      error instanceof LayerResultValidationError &&
      error.message.includes('missing: app.two') &&
      error.message.includes('unexpected: app.replacement'),
  );
});

test('missing, duplicate, extra, and exercised no-op results are rejected', () => {
  const invalidInputs = [
    [{ caseId: 'app.one', status: 'PASSED' }],
    [
      { caseId: 'app.one', status: 'PASSED' },
      { caseId: 'app.one', status: 'PASSED' },
      { caseId: 'app.two', status: 'PASSED' },
    ],
    [
      { caseId: 'app.one', status: 'PASSED' },
      { caseId: 'app.two', status: 'PASSED' },
      { caseId: 'app.extra', status: 'PASSED' },
    ],
    [
      { caseId: 'app.one', status: 'PASSED' },
      { caseId: 'app.two', status: 'PASSED' },
      { caseId: 'factory.only', status: 'PASSED' },
    ],
  ] as const;

  for (const input of invalidInputs) {
    assert.throws(() => normalizeLayerResults(catalog, 'backend', input));
  }
});

test('undefined, ambiguous, pending, skipped, unknown, and failed results are rejected', () => {
  const invalidStatuses = [
    'UNDEFINED',
    'AMBIGUOUS',
    'PENDING',
    'SKIPPED',
    'UNKNOWN',
    'FAILED',
  ] as const;

  for (const status of invalidStatuses) {
    assert.throws(
      () =>
        normalizeLayerResults(catalog, 'backend', [
          { caseId: 'app.one', status },
          { caseId: 'app.two', status: 'PASSED' },
        ]),
      (error: unknown) =>
        error instanceof LayerResultValidationError && error.message.includes(status),
    );
  }
});
