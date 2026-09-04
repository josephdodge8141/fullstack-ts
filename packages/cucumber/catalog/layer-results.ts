import {
  linkedCaseResultSchema,
  normalizedLayerResultSchema,
  type BehaviorCatalog,
  type LinkedCaseResult,
  type NormalizedLayerResult,
} from '@app/schemas';
import { z } from 'zod';

type ApplicationLayer = 'backend' | 'frontend';

export class LayerResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayerResultValidationError';
  }
}

export function normalizeLayerResults(
  catalog: BehaviorCatalog,
  layer: ApplicationLayer,
  input: unknown,
): NormalizedLayerResult {
  const parsed = z.array(linkedCaseResultSchema).safeParse(input);
  if (!parsed.success) {
    throw new LayerResultValidationError(
      `The ${layer} result input is malformed: ${z.prettifyError(parsed.error)}`,
    );
  }
  const results: LinkedCaseResult[] = parsed.data;
  const resultIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const result of results) {
    if (resultIds.has(result.caseId)) {
      duplicateIds.add(result.caseId);
    }
    resultIds.add(result.caseId);
  }
  if (duplicateIds.size > 0) {
    throw new LayerResultValidationError(
      `The ${layer} result contains duplicate case IDs: ${formatSet(duplicateIds)}.`,
    );
  }

  const noops = catalog.cases.flatMap((catalogCase) => {
    const reason = catalogCase.noops[layer];
    return reason === undefined ? [] : [{ caseId: catalogCase.id, reason }];
  });
  const noopIds = new Set(noops.map((entry) => entry.caseId));
  const applicableIds = catalog.cases
    .map((catalogCase) => catalogCase.id)
    .filter((caseId) => !noopIds.has(caseId));
  const applicableSet = new Set(applicableIds);
  const missing = applicableIds.filter((caseId) => !resultIds.has(caseId));
  const unexpected = [...resultIds].filter((caseId) => !applicableSet.has(caseId));
  if (missing.length > 0 || unexpected.length > 0) {
    const parts = [
      ...(missing.length === 0 ? [] : [`missing: ${missing.join(', ')}`]),
      ...(unexpected.length === 0 ? [] : [`unexpected: ${unexpected.join(', ')}`]),
    ];
    throw new LayerResultValidationError(
      `The ${layer} result does not exactly match applicable catalog cases (${parts.join('; ')}).`,
    );
  }

  const nonPassing = results.filter((result) => result.status !== 'PASSED');
  if (nonPassing.length > 0) {
    throw new LayerResultValidationError(
      `The ${layer} result contains non-passing outcomes: ${nonPassing
        .map((result) => `${result.caseId}=${result.status}`)
        .join(', ')}.`,
    );
  }

  const resultByCaseId = new Map(results.map((result) => [result.caseId, result] as const));
  const exercised = applicableIds.map((caseId) => {
    const result = resultByCaseId.get(caseId);
    if (result === undefined) {
      throw new LayerResultValidationError(`The ${layer} result is missing ${caseId}.`);
    }
    return { caseId: result.caseId, status: 'passed' as const };
  });
  const exercisedIds = new Set(exercised.map((entry) => entry.caseId));
  const overlap = [...exercisedIds].filter((caseId) => noopIds.has(caseId));
  if (overlap.length > 0) {
    throw new LayerResultValidationError(
      `The ${layer} exercised and no-op sets overlap: ${overlap.join(', ')}.`,
    );
  }

  return normalizedLayerResultSchema.parse({
    layer,
    exercised,
    noops,
    counts: {
      expected: catalog.cases.length,
      exercised: exercised.length,
      noop: noops.length,
    },
  });
}

function formatSet(values: ReadonlySet<string>): string {
  return [...values].sort((left, right) => left.localeCompare(right)).join(', ');
}
