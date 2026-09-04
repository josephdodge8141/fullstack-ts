import type {
  Envelope,
  GherkinDocument,
  Pickle,
  Scenario,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestRunFinished,
  TestRunHookFinished,
  TestRunHookStarted,
  TestRunStarted,
  TestStepFinished,
} from '@cucumber/messages';
import type { CucumberResultStatus, LinkedCaseResult } from '@app/schemas';

const ENVELOPE_KEYS = new Set([
  'attachment',
  'externalAttachment',
  'gherkinDocument',
  'hook',
  'meta',
  'parameterType',
  'parseError',
  'pickle',
  'suggestion',
  'source',
  'stepDefinition',
  'testCase',
  'testCaseFinished',
  'testCaseStarted',
  'testRunFinished',
  'testRunHookFinished',
  'testRunHookStarted',
  'testRunStarted',
  'testStepFinished',
  'testStepStarted',
  'undefinedParameterType',
]);

const RESULT_STATUSES = new Set<CucumberResultStatus>([
  'UNKNOWN',
  'PASSED',
  'SKIPPED',
  'PENDING',
  'UNDEFINED',
  'AMBIGUOUS',
  'FAILED',
]);

const STATUS_PRIORITY: Readonly<Record<CucumberResultStatus, number>> = {
  PASSED: 0,
  SKIPPED: 1,
  PENDING: 2,
  UNDEFINED: 3,
  AMBIGUOUS: 4,
  UNKNOWN: 5,
  FAILED: 6,
};

type RuntimeScenario = Readonly<{
  scenarioId: string;
  scenarioAstId: string;
  rowCaseIdByAstId: ReadonlyMap<string, string>;
}>;

export class RuntimeEnvelopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeEnvelopeValidationError';
  }
}

export function normalizeRuntimeEnvelopes(input: unknown): readonly LinkedCaseResult[] {
  try {
    return normalizeRuntimeEnvelopesUnchecked(readEnvelopes(input));
  } catch (error: unknown) {
    if (error instanceof RuntimeEnvelopeValidationError) {
      throw error;
    }
    throw new RuntimeEnvelopeValidationError(
      `The Cucumber runtime envelope stream is malformed: ${errorMessage(error)}.`,
    );
  }
}

function normalizeRuntimeEnvelopesUnchecked(envelopes: readonly Envelope[]): LinkedCaseResult[] {
  const documents: GherkinDocument[] = [];
  const pickles = new Map<string, Pickle>();
  const testCases = new Map<string, TestCase>();
  const starts = new Map<string, TestCaseStarted>();
  const stepFinishes = new Map<string, TestStepFinished>();
  const caseFinishes = new Map<string, TestCaseFinished>();
  const runStarts: TestRunStarted[] = [];
  const runFinishes: TestRunFinished[] = [];
  const runHookStarts = new Map<string, TestRunHookStarted>();
  const runHookFinishes = new Map<string, TestRunHookFinished>();

  for (const envelope of envelopes) {
    if (envelope.parseError !== undefined) {
      throw new RuntimeEnvelopeValidationError(
        `The Cucumber runtime reported a Gherkin parse error: ${envelope.parseError.message}.`,
      );
    }
    if (envelope.gherkinDocument !== undefined) {
      documents.push(envelope.gherkinDocument);
    }
    if (envelope.pickle !== undefined) {
      addById(pickles, envelope.pickle, 'pickle');
    }
    if (envelope.testCase !== undefined) {
      addById(testCases, envelope.testCase, 'test case');
    }
    if (envelope.testCaseStarted !== undefined) {
      addById(starts, envelope.testCaseStarted, 'test case start');
    }
    if (envelope.testStepFinished !== undefined) {
      const finished = envelope.testStepFinished;
      const key = `${readId(finished.testCaseStartedId, 'test step start reference')}:${readId(finished.testStepId, 'test step reference')}`;
      if (stepFinishes.has(key)) {
        throw new RuntimeEnvelopeValidationError(
          `Duplicate test step result for ${finished.testCaseStartedId}:${finished.testStepId}.`,
        );
      }
      readStatus(finished.testStepResult?.status);
      stepFinishes.set(key, finished);
    }
    if (envelope.testCaseFinished !== undefined) {
      const finished = envelope.testCaseFinished;
      const startedId = readId(finished.testCaseStartedId, 'test case finish start reference');
      if (caseFinishes.has(startedId)) {
        throw new RuntimeEnvelopeValidationError(
          `Duplicate test case finish for runtime start ${startedId}.`,
        );
      }
      if (typeof finished.willBeRetried !== 'boolean') {
        throw new RuntimeEnvelopeValidationError(
          `Test case finish ${startedId} has no retry disposition.`,
        );
      }
      caseFinishes.set(startedId, finished);
    }
    if (envelope.testRunStarted !== undefined) {
      runStarts.push(envelope.testRunStarted);
    }
    if (envelope.testRunFinished !== undefined) {
      runFinishes.push(envelope.testRunFinished);
    }
    if (envelope.testRunHookStarted !== undefined) {
      addById(runHookStarts, envelope.testRunHookStarted, 'test run hook start');
    }
    if (envelope.testRunHookFinished !== undefined) {
      const finished = envelope.testRunHookFinished;
      const startedId = readId(finished.testRunHookStartedId, 'test run hook finish reference');
      if (runHookFinishes.has(startedId)) {
        throw new RuntimeEnvelopeValidationError(
          `Duplicate test run hook finish for ${startedId}.`,
        );
      }
      readStatus(finished.result?.status);
      runHookFinishes.set(startedId, finished);
    }
  }

  validateRunBoundary(runStarts, runFinishes);
  validateRunHooks(runHookStarts, runHookFinishes);
  const scenarioByAstId = collectRuntimeScenarios(documents);
  const stableCaseIdByPickleId = linkPickles(pickles, scenarioByAstId);
  const testCaseByPickleId = validateTestCases(testCases, pickles);
  validateStartedAndFinishedReferences(starts, stepFinishes, caseFinishes, testCases);

  const startsByTestCaseId = groupStartsByTestCase(starts);
  const results: LinkedCaseResult[] = [];
  const seenCaseIds = new Set<string>();
  for (const [pickleId, testCase] of testCaseByPickleId) {
    const caseStarts = startsByTestCaseId.get(testCase.id) ?? [];
    if (caseStarts.length === 0) {
      continue;
    }
    validateAttempts(caseStarts, caseFinishes, testCase.id);
    const onlyAttempt = caseStarts[0];
    if (onlyAttempt === undefined) {
      throw new RuntimeEnvelopeValidationError(`Test case ${testCase.id} has no runtime attempt.`);
    }
    const aggregateStatus = aggregateAttempt(testCase, onlyAttempt, stepFinishes);
    const stableCaseId = stableCaseIdByPickleId.get(pickleId);
    if (stableCaseId === undefined) {
      throw new RuntimeEnvelopeValidationError(`Test case ${testCase.id} has no stable case link.`);
    }
    if (seenCaseIds.has(stableCaseId)) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime execution produced duplicate stable case ${stableCaseId}.`,
      );
    }
    seenCaseIds.add(stableCaseId);
    results.push({ caseId: stableCaseId, status: aggregateStatus });
  }

  return results.sort((left, right) => left.caseId.localeCompare(right.caseId));
}

function readEnvelopes(input: unknown): readonly Envelope[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new RuntimeEnvelopeValidationError(
      'The Cucumber runtime result must be a non-empty array of envelopes.',
    );
  }
  return input.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime envelope ${String(index)} is not an object.`,
      );
    }
    const keys = Object.keys(entry);
    if (keys.length !== 1 || !ENVELOPE_KEYS.has(keys[0] ?? '')) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime envelope ${String(index)} must contain exactly one recognized message field.`,
      );
    }
    return entry as Envelope;
  });
}

function collectRuntimeScenarios(
  documents: readonly GherkinDocument[],
): ReadonlyMap<string, RuntimeScenario> {
  if (documents.length === 0) {
    throw new RuntimeEnvelopeValidationError('The runtime stream has no GherkinDocument messages.');
  }
  const scenarios = new Map<string, RuntimeScenario>();
  const stableScenarioIds = new Set<string>();
  const rowAstIds = new Set<string>();
  for (const document of documents) {
    if (document.feature === undefined || !Array.isArray(document.feature.children)) {
      throw new RuntimeEnvelopeValidationError('A runtime GherkinDocument has no Feature.');
    }
    const documentScenarios = document.feature.children.flatMap((child) => {
      if (child.scenario !== undefined) {
        return [child.scenario];
      }
      return (
        child.rule?.children.flatMap((ruleChild: { scenario?: Scenario }) =>
          ruleChild.scenario === undefined ? [] : [ruleChild.scenario],
        ) ?? []
      );
    });
    for (const scenario of documentScenarios) {
      const runtimeScenario = buildRuntimeScenario(scenario, rowAstIds);
      if (scenarios.has(runtimeScenario.scenarioAstId)) {
        throw new RuntimeEnvelopeValidationError(
          `Duplicate runtime scenario AST ID ${runtimeScenario.scenarioAstId}.`,
        );
      }
      if (stableScenarioIds.has(runtimeScenario.scenarioId)) {
        throw new RuntimeEnvelopeValidationError(
          `Duplicate runtime scenario ID ${runtimeScenario.scenarioId}.`,
        );
      }
      scenarios.set(runtimeScenario.scenarioAstId, runtimeScenario);
      stableScenarioIds.add(runtimeScenario.scenarioId);
    }
  }
  return scenarios;
}

function buildRuntimeScenario(scenario: Scenario, rowAstIds: Set<string>): RuntimeScenario {
  const scenarioAstId = readId(scenario.id, 'scenario AST ID');
  if (!Array.isArray(scenario.tags) || !Array.isArray(scenario.examples)) {
    throw new RuntimeEnvelopeValidationError(`Runtime scenario ${scenarioAstId} is malformed.`);
  }
  const idTags = scenario.tags.filter((tag) => tag.name.startsWith('@id:'));
  if (idTags.length !== 1) {
    throw new RuntimeEnvelopeValidationError(
      `Runtime scenario ${scenarioAstId} must have exactly one stable @id tag.`,
    );
  }
  const scenarioId = idTags[0]?.name.slice('@id:'.length) ?? '';
  validateStableIdentifier(scenarioId, 'runtime scenario ID');
  const rowCaseIdByAstId = new Map<string, string>();
  const seenRowCaseIds = new Set<string>();
  for (const examples of scenario.examples) {
    if (examples.tableHeader === undefined || !Array.isArray(examples.tableBody)) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime outline ${scenarioId} has Examples without a header or rows.`,
      );
    }
    const header = examples.tableHeader.cells.map((cell: { value: string }) => cell.value.trim());
    const caseIdColumns = header
      .map((column: string, index: number) => ({ column, index }))
      .filter((entry: Readonly<{ column: string; index: number }>) => entry.column === 'case_id');
    if (caseIdColumns.length !== 1) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime outline ${scenarioId} must have exactly one case_id column.`,
      );
    }
    const caseIdColumn = caseIdColumns[0]?.index;
    if (caseIdColumn === undefined) {
      throw new RuntimeEnvelopeValidationError(`Runtime outline ${scenarioId} has no case_id.`);
    }
    for (const row of examples.tableBody) {
      const rowAstId = readId(row.id, 'Examples row AST ID');
      if (row.cells.length !== header.length) {
        throw new RuntimeEnvelopeValidationError(
          `Runtime outline ${scenarioId} has an Examples row with the wrong width.`,
        );
      }
      const rowCaseId = row.cells[caseIdColumn]?.value.trim() ?? '';
      validateStableIdentifier(rowCaseId, 'runtime case_id');
      if (seenRowCaseIds.has(rowCaseId) || rowAstIds.has(rowAstId)) {
        throw new RuntimeEnvelopeValidationError(
          `Runtime outline ${scenarioId} has a duplicate case row identity.`,
        );
      }
      seenRowCaseIds.add(rowCaseId);
      rowAstIds.add(rowAstId);
      rowCaseIdByAstId.set(rowAstId, rowCaseId);
    }
  }
  if (scenario.examples.length > 0 && rowCaseIdByAstId.size === 0) {
    throw new RuntimeEnvelopeValidationError(`Runtime outline ${scenarioId} has no case rows.`);
  }
  return { scenarioId, scenarioAstId, rowCaseIdByAstId };
}

function linkPickles(
  pickles: ReadonlyMap<string, Pickle>,
  scenarioByAstId: ReadonlyMap<string, RuntimeScenario>,
): ReadonlyMap<string, string> {
  if (pickles.size === 0) {
    throw new RuntimeEnvelopeValidationError('The runtime stream has no Pickle messages.');
  }
  const stableCaseIdByPickleId = new Map<string, string>();
  const seenStableCaseIds = new Set<string>();
  for (const [pickleId, pickle] of pickles) {
    if (!Array.isArray(pickle.astNodeIds) || !Array.isArray(pickle.tags)) {
      throw new RuntimeEnvelopeValidationError(`Runtime pickle ${pickleId} is malformed.`);
    }
    const linkedScenarios = pickle.astNodeIds.flatMap((astNodeId) => {
      const scenario = scenarioByAstId.get(astNodeId);
      return scenario === undefined ? [] : [scenario];
    });
    if (linkedScenarios.length !== 1) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime pickle ${pickleId} must link to exactly one scenario AST node.`,
      );
    }
    const scenario = linkedScenarios[0];
    if (scenario === undefined) {
      throw new RuntimeEnvelopeValidationError(`Runtime pickle ${pickleId} has no scenario.`);
    }
    const pickleIdTags = pickle.tags.filter((tag) => tag.name.startsWith('@id:'));
    if (pickleIdTags.length !== 1 || pickleIdTags[0]?.name !== `@id:${scenario.scenarioId}`) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime pickle ${pickleId} does not preserve its scenario stable ID tag.`,
      );
    }
    const linkedRows = pickle.astNodeIds.flatMap((astNodeId) => {
      const rowCaseId = scenario.rowCaseIdByAstId.get(astNodeId);
      return rowCaseId === undefined ? [] : [rowCaseId];
    });
    const isOutline = scenario.rowCaseIdByAstId.size > 0;
    if ((isOutline && linkedRows.length !== 1) || (!isOutline && linkedRows.length !== 0)) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime pickle ${pickleId} does not link unambiguously to its Examples row.`,
      );
    }
    const stableCaseId =
      linkedRows[0] === undefined
        ? scenario.scenarioId
        : `${scenario.scenarioId}::${linkedRows[0]}`;
    if (seenStableCaseIds.has(stableCaseId)) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime pickles contain duplicate stable case ${stableCaseId}.`,
      );
    }
    seenStableCaseIds.add(stableCaseId);
    stableCaseIdByPickleId.set(pickleId, stableCaseId);
  }
  return stableCaseIdByPickleId;
}

function validateTestCases(
  testCases: ReadonlyMap<string, TestCase>,
  pickles: ReadonlyMap<string, Pickle>,
): ReadonlyMap<string, TestCase> {
  const byPickleId = new Map<string, TestCase>();
  const allTestStepIds = new Set<string>();
  for (const testCase of testCases.values()) {
    const pickleId = readId(testCase.pickleId, 'test case pickle reference');
    if (!pickles.has(pickleId)) {
      throw new RuntimeEnvelopeValidationError(
        `Test case ${testCase.id} references unknown runtime pickle ${pickleId}.`,
      );
    }
    if (byPickleId.has(pickleId)) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime pickle ${pickleId} has duplicate test cases.`,
      );
    }
    if (!Array.isArray(testCase.testSteps) || testCase.testSteps.length === 0) {
      throw new RuntimeEnvelopeValidationError(`Test case ${testCase.id} has no executable steps.`);
    }
    for (const testStep of testCase.testSteps) {
      const testStepId = readId(testStep.id, 'test step ID');
      const hasHook = testStep.hookId !== undefined;
      const hasPickleStep = testStep.pickleStepId !== undefined;
      if (hasHook === hasPickleStep) {
        throw new RuntimeEnvelopeValidationError(
          `Test step ${testStepId} must identify exactly one hook or Pickle step.`,
        );
      }
      if (allTestStepIds.has(testStepId)) {
        throw new RuntimeEnvelopeValidationError(`Duplicate runtime test step ID ${testStepId}.`);
      }
      if (
        testStep.pickleStepId !== undefined &&
        !pickles.get(pickleId)?.steps.some((step) => step.id === testStep.pickleStepId)
      ) {
        throw new RuntimeEnvelopeValidationError(
          `Test step ${testStepId} references an unknown Pickle step.`,
        );
      }
      allTestStepIds.add(testStepId);
    }
    byPickleId.set(pickleId, testCase);
  }
  return byPickleId;
}

function validateStartedAndFinishedReferences(
  starts: ReadonlyMap<string, TestCaseStarted>,
  stepFinishes: ReadonlyMap<string, TestStepFinished>,
  caseFinishes: ReadonlyMap<string, TestCaseFinished>,
  testCases: ReadonlyMap<string, TestCase>,
): void {
  for (const start of starts.values()) {
    if (!testCases.has(readId(start.testCaseId, 'test case start test-case reference'))) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime start ${start.id} references unknown test case ${start.testCaseId}.`,
      );
    }
    if (!Number.isInteger(start.attempt) || start.attempt < 0) {
      throw new RuntimeEnvelopeValidationError(
        `Runtime start ${start.id} has invalid attempt ${String(start.attempt)}.`,
      );
    }
    if (!caseFinishes.has(start.id)) {
      throw new RuntimeEnvelopeValidationError(`Runtime start ${start.id} has no finish.`);
    }
  }
  for (const finish of stepFinishes.values()) {
    if (!starts.has(finish.testCaseStartedId)) {
      throw new RuntimeEnvelopeValidationError(
        `Test step result references unknown runtime start ${finish.testCaseStartedId}.`,
      );
    }
  }
  for (const startedId of caseFinishes.keys()) {
    if (!starts.has(startedId)) {
      throw new RuntimeEnvelopeValidationError(
        `Test case finish references unknown runtime start ${startedId}.`,
      );
    }
  }
}

function groupStartsByTestCase(
  starts: ReadonlyMap<string, TestCaseStarted>,
): ReadonlyMap<string, readonly TestCaseStarted[]> {
  const grouped = new Map<string, TestCaseStarted[]>();
  for (const start of starts.values()) {
    const entries = grouped.get(start.testCaseId) ?? [];
    entries.push(start);
    grouped.set(start.testCaseId, entries);
  }
  for (const entries of grouped.values()) {
    entries.sort((left, right) => left.attempt - right.attempt);
  }
  return grouped;
}

function validateAttempts(
  starts: readonly TestCaseStarted[],
  finishes: ReadonlyMap<string, TestCaseFinished>,
  testCaseId: string,
): void {
  if (starts.length !== 1) {
    throw new RuntimeEnvelopeValidationError(
      `Test case ${testCaseId} has ${String(starts.length)} attempts; retried executions are not accepted.`,
    );
  }
  for (const [index, start] of starts.entries()) {
    if (start.attempt !== index) {
      throw new RuntimeEnvelopeValidationError(
        `Test case ${testCaseId} has missing or duplicate attempt ${String(index)}.`,
      );
    }
    const finish = finishes.get(start.id);
    if (finish === undefined) {
      throw new RuntimeEnvelopeValidationError(`Attempt ${start.id} has no finish.`);
    }
    const isFinal = index === starts.length - 1;
    if (finish.willBeRetried === isFinal) {
      throw new RuntimeEnvelopeValidationError(
        `Test case ${testCaseId} has an inconsistent retry disposition at attempt ${String(index)}.`,
      );
    }
  }
}

function aggregateAttempt(
  testCase: TestCase,
  start: TestCaseStarted,
  stepFinishes: ReadonlyMap<string, TestStepFinished>,
): CucumberResultStatus {
  let status: CucumberResultStatus = 'PASSED';
  for (const testStep of testCase.testSteps) {
    const finished = stepFinishes.get(`${start.id}:${testStep.id}`);
    if (finished === undefined) {
      throw new RuntimeEnvelopeValidationError(
        `Attempt ${start.id} has no result for test step ${testStep.id}.`,
      );
    }
    status = worseStatus(status, readStatus(finished.testStepResult.status));
  }
  const extraResults = [...stepFinishes.values()].filter(
    (finished) =>
      finished.testCaseStartedId === start.id &&
      !testCase.testSteps.some((testStep) => testStep.id === finished.testStepId),
  );
  if (extraResults.length > 0) {
    throw new RuntimeEnvelopeValidationError(
      `Attempt ${start.id} has results for unknown test steps.`,
    );
  }
  return status;
}

function validateRunBoundary(
  starts: readonly TestRunStarted[],
  finishes: readonly TestRunFinished[],
): void {
  if (starts.length !== 1 || finishes.length !== 1) {
    throw new RuntimeEnvelopeValidationError(
      'The runtime stream must contain exactly one test run start and finish.',
    );
  }
  const startId = starts[0]?.id;
  const finishedStartId = finishes[0]?.testRunStartedId;
  if (startId !== undefined && finishedStartId !== undefined && startId !== finishedStartId) {
    throw new RuntimeEnvelopeValidationError('The test run finish references another run.');
  }
}

function validateRunHooks(
  starts: ReadonlyMap<string, TestRunHookStarted>,
  finishes: ReadonlyMap<string, TestRunHookFinished>,
): void {
  for (const startedId of starts.keys()) {
    const finish = finishes.get(startedId);
    if (finish === undefined) {
      throw new RuntimeEnvelopeValidationError(`Test run hook ${startedId} has no finish.`);
    }
    const status = readStatus(finish.result.status);
    if (status !== 'PASSED') {
      throw new RuntimeEnvelopeValidationError(
        `Test run hook ${startedId} has non-passing status ${status}.`,
      );
    }
  }
  for (const startedId of finishes.keys()) {
    if (!starts.has(startedId)) {
      throw new RuntimeEnvelopeValidationError(
        `Test run hook finish references unknown start ${startedId}.`,
      );
    }
  }
}

function addById<T extends Readonly<{ id: string }>>(
  values: Map<string, T>,
  value: T,
  label: string,
): void {
  const id = readId(value.id, `${label} ID`);
  if (values.has(id)) {
    throw new RuntimeEnvelopeValidationError(`Duplicate ${label} ID ${id}.`);
  }
  values.set(id, value);
}

function readId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RuntimeEnvelopeValidationError(`The ${label} is missing or invalid.`);
  }
  return value;
}

function readStatus(value: unknown): CucumberResultStatus {
  if (typeof value !== 'string' || !RESULT_STATUSES.has(value as CucumberResultStatus)) {
    throw new RuntimeEnvelopeValidationError(`Unknown Cucumber result status ${String(value)}.`);
  }
  return value as CucumberResultStatus;
}

function worseStatus(
  left: CucumberResultStatus,
  right: CucumberResultStatus,
): CucumberResultStatus {
  return STATUS_PRIORITY[left] >= STATUS_PRIORITY[right] ? left : right;
}

function validateStableIdentifier(value: string, label: string): void {
  if (!/^[a-z0-9_-](?:[a-z0-9._-]*[a-z0-9_-])?$/.test(value)) {
    throw new RuntimeEnvelopeValidationError(
      `The ${label} "${value}" is not a valid stable identifier.`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
