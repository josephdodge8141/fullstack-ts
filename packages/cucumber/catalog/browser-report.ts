import {
  browserCaptureRegistrySchema,
  browserReportSchema,
  type BehaviorCatalog,
  type BrowserExecutionIdentity,
} from '@app/schemas';
import { z } from 'zod';

export type BrowserReportEvaluation = Readonly<{
  counts: Readonly<{
    expected: number;
    passed: number;
    noop: number;
  }>;
}>;

export class BrowserReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrowserReportValidationError';
  }
}

export function evaluateBrowserReport(
  catalog: BehaviorCatalog,
  expectedIdentity: BrowserExecutionIdentity,
  trustedCaptureRegistry: unknown,
  input: unknown,
): BrowserReportEvaluation {
  const captures = browserCaptureRegistrySchema.safeParse(trustedCaptureRegistry);
  if (!captures.success) {
    throw new BrowserReportValidationError(
      `The trusted browser capture registry is malformed: ${z.prettifyError(captures.error)}`,
    );
  }
  const parsed = browserReportSchema.safeParse(input);
  if (!parsed.success) {
    throw new BrowserReportValidationError(
      `The browser report is malformed: ${z.prettifyError(parsed.error)}`,
    );
  }
  const report = parsed.data;
  validateIdentity(report, expectedIdentity, 'browser report');
  const evidenceIds = new Set<string>();
  const duplicateEvidenceIds = new Set<string>();
  for (const capture of captures.data.captures) {
    validateIdentity(capture, expectedIdentity, `trusted capture ${capture.id}`);
    if (evidenceIds.has(capture.id)) {
      duplicateEvidenceIds.add(capture.id);
    }
    evidenceIds.add(capture.id);
  }
  if (duplicateEvidenceIds.size > 0) {
    throw new BrowserReportValidationError(
      `The trusted browser capture registry contains duplicate capture IDs: ${formatSet(duplicateEvidenceIds)}.`,
    );
  }

  const seenCaseIds = new Set<string>();
  const duplicateCaseIds = new Set<string>();
  for (const result of report.cases) {
    if (seenCaseIds.has(result.caseId)) {
      duplicateCaseIds.add(result.caseId);
    }
    seenCaseIds.add(result.caseId);
  }
  if (duplicateCaseIds.size > 0) {
    throw new BrowserReportValidationError(
      `The browser report contains duplicate case IDs: ${formatSet(duplicateCaseIds)}.`,
    );
  }

  const expectedCaseIds = catalog.cases.map((catalogCase) => catalogCase.id);
  const expectedSet = new Set(expectedCaseIds);
  const missing = expectedCaseIds.filter((caseId) => !seenCaseIds.has(caseId));
  const extra = [...seenCaseIds].filter((caseId) => !expectedSet.has(caseId));
  if (missing.length > 0 || extra.length > 0) {
    const parts = [
      ...(missing.length === 0 ? [] : [`missing: ${missing.join(', ')}`]),
      ...(extra.length === 0 ? [] : [`extra: ${extra.join(', ')}`]),
    ];
    throw new BrowserReportValidationError(
      `The browser report case inventory is not exact (${parts.join('; ')}).`,
    );
  }

  const caseById = new Map(
    catalog.cases.map((catalogCase) => [catalogCase.id, catalogCase] as const),
  );
  let passed = 0;
  let noop = 0;
  for (const result of report.cases) {
    const catalogCase = caseById.get(result.caseId);
    if (catalogCase === undefined) {
      throw new BrowserReportValidationError(`Unexpected browser case ${result.caseId}.`);
    }
    const uniqueEvidenceRefs = new Set(result.evidenceRefs);
    if (uniqueEvidenceRefs.size !== result.evidenceRefs.length) {
      throw new BrowserReportValidationError(
        `Browser case ${result.caseId} contains duplicate evidence references.`,
      );
    }
    const uncapturedRefs = result.evidenceRefs.filter((reference) => !evidenceIds.has(reference));
    if (uncapturedRefs.length > 0) {
      throw new BrowserReportValidationError(
        `Browser case ${result.caseId} references uncaptured evidence: ${uncapturedRefs.join(', ')}.`,
      );
    }
    if (result.outcome === 'failed' || result.outcome === 'uncertain') {
      throw new BrowserReportValidationError(
        `Browser case ${result.caseId} has disallowed ${result.outcome} outcome.`,
      );
    }
    if (result.outcome === 'noop') {
      if (!catalogCase.browserNoopEligible) {
        throw new BrowserReportValidationError(
          `Browser case ${result.caseId} is not eligible for a no-op outcome.`,
        );
      }
      noop += 1;
      continue;
    }
    if (result.evidenceRefs.length === 0) {
      throw new BrowserReportValidationError(
        `Passed browser case ${result.caseId} has no observation evidence reference.`,
      );
    }
    passed += 1;
  }

  return {
    counts: {
      expected: expectedCaseIds.length,
      passed,
      noop,
    },
  };
}

function validateIdentity(
  actual: BrowserExecutionIdentity,
  expected: BrowserExecutionIdentity,
  subject: string,
): void {
  const mismatches = [
    ...(actual.candidateSha === expected.candidateSha ? [] : ['candidateSha']),
    ...(actual.deploymentGeneration === expected.deploymentGeneration
      ? []
      : ['deploymentGeneration']),
    ...(actual.workflowRunId === expected.workflowRunId ? [] : ['workflowRunId']),
    ...(actual.workflowRunAttempt === expected.workflowRunAttempt ? [] : ['workflowRunAttempt']),
  ];
  if (mismatches.length > 0) {
    throw new BrowserReportValidationError(
      `The ${subject} execution identity does not match: ${mismatches.join(', ')}.`,
    );
  }
}

function formatSet(values: ReadonlySet<string>): string {
  return [...values].sort((left, right) => left.localeCompare(right)).join(', ');
}
