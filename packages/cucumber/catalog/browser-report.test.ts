import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBehaviorSources } from './catalog.js';
import { BrowserReportValidationError, evaluateBrowserReport } from './browser-report.js';

const catalog = parseBehaviorSources([
  {
    category: 'application',
    uri: 'application/browser.feature',
    data: `Feature: Browser cases
  @id:browser.visible
  Scenario: Visible behavior
    Given visible behavior

  @id:browser.protocol @browser-noop-eligible
  Scenario: Protocol-only behavior
    browser-noop: This protocol condition has no permitted browser setup channel.
    Given protocol behavior
`,
  },
]);

const expectedIdentity = {
  candidateSha: 'a'.repeat(40),
  deploymentGeneration: 'generation-7',
  workflowRunId: '4123',
  workflowRunAttempt: 2,
};

function validRegistry(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    captures: [
      {
        id: 'observation-1',
        ...expectedIdentity,
        kind: 'screenshot',
        redacted: true,
        locator: 'workflow-artifact://browser-captures/observation-1.png',
        contentDigest: `sha256:${'c'.repeat(64)}`,
      },
    ],
  };
}

function validReport(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    ...expectedIdentity,
    cases: [
      {
        caseId: 'browser.visible',
        outcome: 'passed',
        reason: 'Hello World was visible',
        evidenceRefs: ['observation-1'],
      },
      {
        caseId: 'browser.protocol',
        outcome: 'noop',
        reason: 'No permitted browser setup channel exists',
        evidenceRefs: [],
      },
    ],
  };
}

test('a complete report joins runner-held capture provenance and is accepted', () => {
  const result = evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), validReport());

  assert.deepEqual(result.counts, { expected: 2, passed: 1, noop: 1 });
});

test('the model report cannot self-declare captured evidence or observation contents', () => {
  for (const modelOwnedEvidence of [
    {
      capturedEvidence: [
        {
          id: 'invented',
          kind: 'screenshot',
          redacted: true,
          locator: 'workflow-artifact://invented',
          contentDigest: `sha256:${'d'.repeat(64)}`,
        },
      ],
    },
    { observationContents: [{ id: 'observation-1', body: 'self-attested page text' }] },
  ]) {
    assert.throws(() =>
      evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), {
        ...validReport(),
        ...modelOwnedEvidence,
      }),
    );
  }
});

test('invented, missing, and cross-run capture references are rejected', () => {
  const invented = validReport();
  const firstCase = validCases(invented)[0];
  invented.cases = [
    { ...firstCase, evidenceRefs: ['invented-observation'] },
    validCases(invented)[1],
  ];

  const crossRunRegistry = validRegistry();
  crossRunRegistry.captures = validCaptures(crossRunRegistry).map((capture) => ({
    ...capture,
    workflowRunAttempt: 3,
  }));

  assert.throws(() => evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), invented));
  assert.throws(() =>
    evaluateBrowserReport(
      catalog,
      expectedIdentity,
      { schemaVersion: 1, captures: [] },
      validReport(),
    ),
  );
  assert.throws(
    () => evaluateBrowserReport(catalog, expectedIdentity, crossRunRegistry, validReport()),
    (error: unknown) =>
      error instanceof BrowserReportValidationError && /identity|attempt|run/i.test(error.message),
  );
});

test('malformed, duplicate, and unredacted trusted captures are rejected', () => {
  const malformedRegistries: ReadonlyArray<Record<string, unknown>> = [
    {
      schemaVersion: 1,
      captures: validCaptures(validRegistry()).map(({ locator: _locator, ...capture }) => capture),
    },
    {
      schemaVersion: 1,
      captures: validCaptures(validRegistry()).map((capture) => ({
        ...capture,
        contentDigest: 'sha256:not-a-digest',
      })),
    },
    {
      schemaVersion: 1,
      captures: validCaptures(validRegistry()).map((capture) => ({
        ...capture,
        locator: 'https://mutable.example/observation',
      })),
    },
    {
      schemaVersion: 1,
      captures: validCaptures(validRegistry()).map((capture) => ({
        ...capture,
        redacted: false,
      })),
    },
    {
      schemaVersion: 1,
      captures: [...validCaptures(validRegistry()), ...validCaptures(validRegistry())],
    },
  ];

  for (const registry of malformedRegistries) {
    assert.throws(() => evaluateBrowserReport(catalog, expectedIdentity, registry, validReport()));
  }
});

test('missing, extra, and duplicate browser case IDs are rejected', () => {
  const missing = validReport();
  missing.cases = [validCases(missing)[0]];

  const extra = validReport();
  extra.cases = [
    ...validCases(extra),
    {
      caseId: 'browser.extra',
      outcome: 'passed',
      reason: 'Unexpected',
      evidenceRefs: ['observation-1'],
    },
  ];

  const duplicate = validReport();
  duplicate.cases = [...validCases(duplicate), validCases(duplicate)[0]];

  for (const report of [missing, extra, duplicate]) {
    assert.throws(() => evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), report));
  }
});

test('a passing result without an observation is rejected', () => {
  const report = validReport();
  const firstCase = validCases(report)[0];
  report.cases = [{ ...firstCase, evidenceRefs: [] }, validCases(report)[1]];

  assert.throws(
    () => evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), report),
    (error: unknown) =>
      error instanceof BrowserReportValidationError && /observation/i.test(error.message),
  );
});

test('a no-op without catalog eligibility is rejected', () => {
  const report = validReport();
  const firstCase = validCases(report)[0];
  report.cases = [
    {
      ...firstCase,
      outcome: 'noop',
      reason: 'The runner chose not to evaluate it',
      evidenceRefs: [],
    },
    validCases(report)[1],
  ];

  assert.throws(
    () => evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), report),
    (error: unknown) =>
      error instanceof BrowserReportValidationError && /not eligible/i.test(error.message),
  );
});

test('failed and uncertain outcomes cannot approve a report', () => {
  for (const outcome of ['failed', 'uncertain'] as const) {
    const report = validReport();
    const firstCase = validCases(report)[0];
    report.cases = [{ ...firstCase, outcome, reason: `${outcome} result` }, validCases(report)[1]];

    assert.throws(
      () => evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), report),
      (error: unknown) =>
        error instanceof BrowserReportValidationError && error.message.includes(outcome),
    );
  }
});

test('candidate, generation, run, and attempt mismatches are rejected', () => {
  const mismatches: ReadonlyArray<Readonly<Record<string, unknown>>> = [
    { candidateSha: 'b'.repeat(40) },
    { deploymentGeneration: 'generation-8' },
    { workflowRunId: '4124' },
    { workflowRunAttempt: 3 },
  ];

  for (const mismatch of mismatches) {
    assert.throws(() =>
      evaluateBrowserReport(catalog, expectedIdentity, validRegistry(), {
        ...validReport(),
        ...mismatch,
      }),
    );
  }
});

function validCases(report: Record<string, unknown>): ReadonlyArray<Record<string, unknown>> {
  const cases = report.cases;
  assert.ok(Array.isArray(cases));
  return cases.filter((entry): entry is Record<string, unknown> => isRecord(entry));
}

function validCaptures(registry: Record<string, unknown>): ReadonlyArray<Record<string, unknown>> {
  const captures = registry.captures;
  assert.ok(Array.isArray(captures));
  return captures.filter((entry): entry is Record<string, unknown> => isRecord(entry));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
