import {
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
  input: unknown,
): BrowserReportEvaluation {
  const parsed = browserReportSchema.safeParse(input);
  if (!parsed.success) {
    throw new BrowserReportValidationError(
      `The browser report is malformed: ${z.prettifyError(parsed.error)}`,
    );
  }
  const report = parsed.data;
  const identityMismatches = [
    ...(report.candidateSha === expectedIdentity.candidateSha ? [] : ['candidateSha']),
    ...(report.deploymentGeneration === expectedIdentity.deploymentGeneration
      ? []
      : ['deploymentGeneration']),
    ...(report.workflowRunId === expectedIdentity.workflowRunId ? [] : ['workflowRunId']),
    ...(report.workflowRunAttempt === expectedIdentity.workflowRunAttempt
      ? []
      : ['workflowRunAttempt']),
  ];
  if (identityMismatches.length > 0) {
    throw new BrowserReportValidationError(
      `The browser report execution identity does not match: ${identityMismatches.join(', ')}.`,
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

  const evidenceIds = new Set<string>();
  const duplicateEvidenceIds = new Set<string>();
  for (const evidence of report.capturedEvidence) {
    if (evidenceIds.has(evidence.id)) {
      duplicateEvidenceIds.add(evidence.id);
    }
    evidenceIds.add(evidence.id);
  }
  if (duplicateEvidenceIds.size > 0) {
    throw new BrowserReportValidationError(
      `The browser report contains duplicate evidence IDs: ${formatSet(duplicateEvidenceIds)}.`,
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

function formatSet(values: ReadonlySet<string>): string {
  return [...values].sort((left, right) => left.localeCompare(right)).join(', ');
}
