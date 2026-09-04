import { generateMessages } from '@cucumber/gherkin';
import {
  IdGenerator,
  SourceMediaType,
  type Background,
  type Examples,
  type GherkinDocument,
  type Pickle,
  type PickleStep,
  type Rule,
  type Scenario,
  type Step,
  type Tag,
} from '@cucumber/messages';
import {
  behaviorCatalogSchema,
  type BehaviorCatalog,
  type BehaviorCase,
  type BehaviorCategory,
  type BehaviorNoops,
  type CatalogBackground,
  type CatalogExample,
  type CatalogStep,
  type CatalogStepArgument,
} from '@app/schemas';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const NOOP_TAGS = [
  '@backend-noop',
  '@frontend-noop',
  '@browser-noop-eligible',
  '@browser-noop',
] as const;

const REASON_PREFIXES = {
  backend: 'backend-noop:',
  frontend: 'frontend-noop:',
  browser: 'browser-noop:',
} as const;

export type BehaviorSource = Readonly<{
  uri: string;
  data: string;
}>;

type ScenarioContext = Readonly<{
  document: GherkinDocument;
  scenario: Scenario;
  rule?: Rule;
  featureBackground?: Background;
  ruleBackground?: Background;
  scenarioId: string;
  rowCases: ReadonlyMap<string, OutlineCase>;
  noops: BehaviorNoops;
  browserNoopEligible: boolean;
  category: BehaviorCategory;
  uri: string;
}>;

type OutlineCase = Readonly<{
  caseId: string;
  example: CatalogExample;
}>;

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogValidationError';
  }
}

export function parseBehaviorSources(sources: readonly BehaviorSource[]): BehaviorCatalog {
  if (sources.length === 0) {
    throw new CatalogValidationError('The behavior catalog has no feature sources.');
  }

  const newId = IdGenerator.incrementing();
  const contexts: ScenarioContext[] = [];
  const pickles: Pickle[] = [];
  const scenarioIds = new Set<string>();

  for (const source of sources) {
    const envelopes = generateMessages(
      source.data,
      source.uri,
      SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
      {
        includeGherkinDocument: true,
        includePickles: true,
        newId,
      },
    );
    const parseErrors = envelopes.flatMap((envelope) =>
      envelope.parseError === undefined ? [] : [envelope.parseError],
    );
    if (parseErrors.length > 0) {
      const details = parseErrors
        .map(
          (parseError) =>
            `${parseError.source.uri ?? source.uri}:${parseError.source.location?.line ?? 0} ${parseError.message}`,
        )
        .join('; ');
      throw new CatalogValidationError(`Gherkin parsing failed: ${details}`);
    }

    const document = envelopes.find(
      (envelope) => envelope.gherkinDocument !== undefined,
    )?.gherkinDocument;
    if (document?.feature === undefined) {
      throw new CatalogValidationError(`${source.uri} does not contain a Feature.`);
    }

    contexts.push(...collectScenarioContexts(document, source.uri, scenarioIds));
    for (const envelope of envelopes) {
      if (envelope.pickle !== undefined) {
        pickles.push(envelope.pickle);
      }
    }
  }

  const contextByScenarioAstId = new Map(
    contexts.map((context) => [context.scenario.id, context] as const),
  );
  const expectedPickleCount = contexts.reduce(
    (count, context) => count + Math.max(context.rowCases.size, 1),
    0,
  );
  if (pickles.length !== expectedPickleCount) {
    throw new CatalogValidationError(
      `Gherkin compiled ${pickles.length} cases but ${expectedPickleCount} expanded cases were expected.`,
    );
  }

  const cases: BehaviorCase[] = [];
  const expandedIds = new Set<string>();
  const pickleIdToCaseId: Record<string, string> = {};

  for (const pickle of pickles) {
    const matchingContexts = pickle.astNodeIds.flatMap((astNodeId) => {
      const context = contextByScenarioAstId.get(astNodeId);
      return context === undefined ? [] : [context];
    });
    if (matchingContexts.length !== 1) {
      throw new CatalogValidationError(
        `Pickle ${pickle.id} has ${matchingContexts.length} stable scenario links; exactly one is required.`,
      );
    }
    const context = matchingContexts[0];
    if (context === undefined) {
      throw new CatalogValidationError(`Pickle ${pickle.id} has no stable scenario link.`);
    }
    const linkedRows = pickle.astNodeIds.flatMap((astNodeId) => {
      const outlineCase = context.rowCases.get(astNodeId);
      return outlineCase === undefined ? [] : [outlineCase];
    });
    const outline = context.rowCases.size > 0;
    if ((outline && linkedRows.length !== 1) || (!outline && linkedRows.length !== 0)) {
      throw new CatalogValidationError(
        `Pickle ${pickle.id} does not link unambiguously to one expanded Examples row.`,
      );
    }

    const outlineCase = linkedRows[0];
    const stableCaseId =
      outlineCase === undefined
        ? context.scenarioId
        : `${context.scenarioId}::${outlineCase.caseId}`;
    if (expandedIds.has(stableCaseId)) {
      throw new CatalogValidationError(`Duplicate expanded case identity "${stableCaseId}".`);
    }
    expandedIds.add(stableCaseId);
    if (pickleIdToCaseId[pickle.id] !== undefined) {
      throw new CatalogValidationError(`Duplicate Cucumber pickle ID "${pickle.id}".`);
    }
    pickleIdToCaseId[pickle.id] = stableCaseId;
    cases.push(buildBehaviorCase(context, pickle, stableCaseId, outlineCase));
  }

  return behaviorCatalogSchema.parse({
    schemaVersion: 1,
    cases,
    pickleIdToCaseId,
  });
}

export async function loadBehaviorCatalog(featureRoot: string): Promise<BehaviorCatalog> {
  const filePaths = await listFeatureFiles(featureRoot);
  const sources = await Promise.all(
    filePaths.map(async (filePath) => ({
      uri: path.relative(featureRoot, filePath).split(path.sep).join('/'),
      data: await readFile(filePath, 'utf8'),
    })),
  );
  return parseBehaviorSources(sources);
}

function collectScenarioContexts(
  document: GherkinDocument,
  uri: string,
  scenarioIds: Set<string>,
): ScenarioContext[] {
  const feature = document.feature;
  if (feature === undefined) {
    throw new CatalogValidationError(`${uri} does not contain a Feature.`);
  }
  rejectInheritedNoops(feature.tags, `Feature "${feature.name}"`);
  const featureBackground = feature.children.find(
    (child) => child.background !== undefined,
  )?.background;
  const category = categoryForUri(uri);
  const contexts: ScenarioContext[] = [];

  for (const child of feature.children) {
    if (child.scenario !== undefined) {
      contexts.push(
        makeScenarioContext({
          document,
          scenario: child.scenario,
          rule: undefined,
          featureBackground,
          ruleBackground: undefined,
          scenarioIds,
          category,
          uri,
        }),
      );
    }
    if (child.rule !== undefined) {
      const rule = child.rule;
      rejectInheritedNoops(rule.tags, `Rule "${rule.name}"`);
      const ruleBackground = rule.children.find(
        (ruleChild) => ruleChild.background !== undefined,
      )?.background;
      for (const ruleChild of rule.children) {
        if (ruleChild.scenario !== undefined) {
          contexts.push(
            makeScenarioContext({
              document,
              scenario: ruleChild.scenario,
              rule,
              featureBackground,
              ruleBackground,
              scenarioIds,
              category,
              uri,
            }),
          );
        }
      }
    }
  }
  return contexts;
}

function makeScenarioContext(input: {
  document: GherkinDocument;
  scenario: Scenario;
  rule: Rule | undefined;
  featureBackground: Background | undefined;
  ruleBackground: Background | undefined;
  scenarioIds: Set<string>;
  category: BehaviorCategory;
  uri: string;
}): ScenarioContext {
  const ownIdTags = input.scenario.tags.filter((tag) => tag.name.startsWith('@id:'));
  if (ownIdTags.length !== 1) {
    throw new CatalogValidationError(
      `${input.uri}:${input.scenario.location.line} Scenario "${input.scenario.name}" must have exactly one @id:<identifier> tag.`,
    );
  }
  const idTag = ownIdTags[0];
  const scenarioId = idTag?.name.slice('@id:'.length) ?? '';
  validateStableIdentifier(scenarioId, 'scenario ID', input.uri, input.scenario.location.line);
  if (input.scenarioIds.has(scenarioId)) {
    throw new CatalogValidationError(`Duplicate scenario ID "${scenarioId}".`);
  }
  input.scenarioIds.add(scenarioId);

  const { noops, browserNoopEligible } = validateScenarioNoops(input.scenario);
  const rowCases = collectOutlineCases(input.scenario, input.uri);

  const optionalRule =
    input.rule === undefined
      ? {}
      : {
          rule: input.rule,
        };
  const optionalFeatureBackground =
    input.featureBackground === undefined ? {} : { featureBackground: input.featureBackground };
  const optionalRuleBackground =
    input.ruleBackground === undefined ? {} : { ruleBackground: input.ruleBackground };

  return {
    document: input.document,
    scenario: input.scenario,
    ...optionalRule,
    ...optionalFeatureBackground,
    ...optionalRuleBackground,
    scenarioId,
    rowCases,
    noops,
    browserNoopEligible,
    category: input.category,
    uri: input.uri,
  };
}

function collectOutlineCases(scenario: Scenario, uri: string): ReadonlyMap<string, OutlineCase> {
  if (scenario.examples.length === 0) {
    return new Map();
  }
  const rowCases = new Map<string, OutlineCase>();
  const seenCaseIds = new Set<string>();
  let totalRows = 0;

  for (const examples of scenario.examples) {
    rejectInheritedNoops(examples.tags, `Examples "${examples.name}"`);
    totalRows += examples.tableBody.length;
    const header = readExampleHeader(examples, uri, scenario);
    const caseIdColumn = header.indexOf('case_id');
    for (const row of examples.tableBody) {
      if (row.cells.length !== header.length) {
        throw new CatalogValidationError(
          `${uri}:${row.location.line} Examples rows must contain exactly ${String(header.length)} values.`,
        );
      }
      const caseId = row.cells[caseIdColumn]?.value.trim() ?? '';
      if (caseId.length === 0) {
        throw new CatalogValidationError(
          `${uri}:${row.location.line} every Examples row must have a non-empty case_id.`,
        );
      }
      validateStableIdentifier(caseId, 'case_id', uri, row.location.line);
      if (seenCaseIds.has(caseId)) {
        throw new CatalogValidationError(
          `${uri}:${row.location.line} duplicate case_id "${caseId}" across Examples blocks.`,
        );
      }
      seenCaseIds.add(caseId);
      const values: Record<string, string> = {};
      for (const [index, column] of header.entries()) {
        values[column] = row.cells[index]?.value ?? '';
      }
      rowCases.set(row.id, {
        caseId,
        example: {
          name: examples.name,
          description: examples.description,
          values,
        },
      });
    }
  }
  if (totalRows === 0) {
    throw new CatalogValidationError(
      `${uri}:${scenario.location.line} Scenario Outline "${scenario.name}" has no Examples rows.`,
    );
  }
  return rowCases;
}

function readExampleHeader(examples: Examples, uri: string, scenario: Scenario): string[] {
  if (examples.tableHeader === undefined) {
    throw new CatalogValidationError(
      `${uri}:${examples.location.line} Scenario Outline "${scenario.name}" needs an Examples header with case_id.`,
    );
  }
  const header = examples.tableHeader.cells.map((cell) => cell.value.trim());
  if (new Set(header).size !== header.length) {
    throw new CatalogValidationError(
      `${uri}:${examples.location.line} Examples column names must be unique.`,
    );
  }
  if (header.filter((column) => column === 'case_id').length !== 1) {
    throw new CatalogValidationError(
      `${uri}:${examples.location.line} each Examples block must contain exactly one case_id column.`,
    );
  }
  return header;
}

function validateScenarioNoops(scenario: Scenario): {
  noops: BehaviorNoops;
  browserNoopEligible: boolean;
} {
  const tagNames = new Set(scenario.tags.map((tag) => tag.name));
  if (tagNames.has('@browser-noop')) {
    throw new CatalogValidationError(
      `Scenario "${scenario.name}" uses illegal @browser-noop; use @browser-noop-eligible with a browser-noop reason.`,
    );
  }
  const reasons = readNoopReasons(scenario.description, scenario.name);
  const noops: BehaviorNoops = {};
  validateNoopPair(tagNames, '@backend-noop', 'backend', reasons.backend, scenario.name);
  validateNoopPair(tagNames, '@frontend-noop', 'frontend', reasons.frontend, scenario.name);
  validateNoopPair(tagNames, '@browser-noop-eligible', 'browser', reasons.browser, scenario.name);
  if (reasons.backend !== undefined) {
    noops.backend = reasons.backend;
  }
  if (reasons.frontend !== undefined) {
    noops.frontend = reasons.frontend;
  }
  if (reasons.browser !== undefined) {
    noops.browser = reasons.browser;
  }
  return {
    noops,
    browserNoopEligible: tagNames.has('@browser-noop-eligible'),
  };
}

function readNoopReasons(description: string, scenarioName: string): BehaviorNoops {
  const reasons: BehaviorNoops = {};
  for (const untrimmedLine of description.split('\n')) {
    const line = untrimmedLine.trim();
    for (const [layer, prefix] of Object.entries(REASON_PREFIXES)) {
      if (line.startsWith(`${prefix.slice(0, -1)} `)) {
        throw new CatalogValidationError(
          `Scenario "${scenarioName}" has malformed ${prefix.slice(0, -1)} annotation; a colon is required.`,
        );
      }
      if (!line.startsWith(prefix)) {
        continue;
      }
      const key = layer as keyof BehaviorNoops;
      if (reasons[key] !== undefined) {
        throw new CatalogValidationError(
          `Scenario "${scenarioName}" has duplicate ${prefix.slice(0, -1)} reason lines.`,
        );
      }
      const reason = line.slice(prefix.length).trim();
      if (reason.length === 0) {
        throw new CatalogValidationError(
          `Scenario "${scenarioName}" has an empty ${prefix.slice(0, -1)} reason.`,
        );
      }
      reasons[key] = reason;
    }
  }
  return reasons;
}

function validateNoopPair(
  tagNames: ReadonlySet<string>,
  tag: string,
  layer: keyof BehaviorNoops,
  reason: string | undefined,
  scenarioName: string,
): void {
  const hasTag = tagNames.has(tag);
  if (hasTag && reason === undefined) {
    throw new CatalogValidationError(
      `Scenario "${scenarioName}" has ${tag} but is missing its ${layer}-noop reason description line.`,
    );
  }
  if (!hasTag && reason !== undefined) {
    throw new CatalogValidationError(
      `Scenario "${scenarioName}" has a ${layer}-noop reason without the corresponding ${tag} tag.`,
    );
  }
}

function rejectInheritedNoops(tags: readonly Tag[], owner: string): void {
  const illegalTag = tags.find((tag) => NOOP_TAGS.includes(tag.name as (typeof NOOP_TAGS)[number]));
  if (illegalTag !== undefined) {
    throw new CatalogValidationError(
      `${owner} cannot declare ${illegalTag.name}; no-op annotations must be placed directly on a Scenario or Scenario Outline.`,
    );
  }
}

function buildBehaviorCase(
  context: ScenarioContext,
  pickle: Pickle,
  stableCaseId: string,
  outlineCase: OutlineCase | undefined,
): BehaviorCase {
  const feature = context.document.feature;
  if (feature === undefined) {
    throw new CatalogValidationError(`${context.uri} does not contain a Feature.`);
  }
  const allAstSteps = [
    ...(context.featureBackground?.steps ?? []),
    ...(context.ruleBackground?.steps ?? []),
    ...context.scenario.steps,
  ];
  const stepByAstId = new Map(allAstSteps.map((step) => [step.id, step] as const));
  const backgrounds: BehaviorCase['backgrounds'] = {};
  if (context.featureBackground !== undefined) {
    backgrounds.feature = buildBackground(context.featureBackground, pickle, stepByAstId);
  }
  if (context.ruleBackground !== undefined) {
    backgrounds.rule = buildBackground(context.ruleBackground, pickle, stepByAstId);
  }
  const optionalExample =
    outlineCase === undefined ? {} : { caseId: outlineCase.caseId, example: outlineCase.example };
  const optionalRule =
    context.rule === undefined
      ? {}
      : {
          ruleName: context.rule.name,
          ruleDescription: context.rule.description,
        };

  return {
    id: stableCaseId,
    scenarioId: context.scenarioId,
    ...optionalExample,
    pickleId: pickle.id,
    category: context.category,
    factoryApplicable: context.category === 'factory',
    featureName: feature.name,
    featureDescription: feature.description,
    ...optionalRule,
    scenarioName: context.scenario.name,
    scenarioDescription: context.scenario.description,
    sourceUri: context.uri,
    sourceLine: context.scenario.location.line,
    tags: pickle.tags.map((tag) => tag.name),
    backgrounds,
    steps: pickle.steps.map((step) => convertPickleStep(step, stepByAstId)),
    noops: context.noops,
    browserNoopEligible: context.browserNoopEligible,
  };
}

function buildBackground(
  background: Background,
  pickle: Pickle,
  stepByAstId: ReadonlyMap<string, Step>,
): CatalogBackground {
  const backgroundStepIds = new Set(background.steps.map((step) => step.id));
  const steps = pickle.steps
    .filter((pickleStep) =>
      pickleStep.astNodeIds.some((astNodeId) => backgroundStepIds.has(astNodeId)),
    )
    .map((pickleStep) => convertPickleStep(pickleStep, stepByAstId));
  return {
    name: background.name,
    description: background.description,
    steps,
  };
}

function convertPickleStep(
  pickleStep: PickleStep,
  stepByAstId: ReadonlyMap<string, Step>,
): CatalogStep {
  const astStep = pickleStep.astNodeIds
    .map((astNodeId) => stepByAstId.get(astNodeId))
    .find((step) => step !== undefined);
  if (astStep === undefined) {
    throw new CatalogValidationError(
      `Pickle step "${pickleStep.text}" does not link to a Gherkin AST step.`,
    );
  }
  const argument = convertArgument(pickleStep);
  return argument === undefined
    ? { keyword: astStep.keyword, text: pickleStep.text }
    : { keyword: astStep.keyword, text: pickleStep.text, argument };
}

function convertArgument(pickleStep: PickleStep): CatalogStepArgument | undefined {
  const argument = pickleStep.argument;
  if (argument?.docString !== undefined) {
    const mediaType = argument.docString.mediaType;
    return mediaType === undefined
      ? { type: 'docString', content: argument.docString.content }
      : { type: 'docString', content: argument.docString.content, mediaType };
  }
  if (argument?.dataTable !== undefined) {
    return {
      type: 'dataTable',
      rows: argument.dataTable.rows.map((row) => row.cells.map((cell) => cell.value)),
    };
  }
  return undefined;
}

function categoryForUri(uri: string): BehaviorCategory {
  const segments = uri.replaceAll('\\', '/').split('/');
  return segments.includes('factory') ? 'factory' : 'application';
}

function validateStableIdentifier(value: string, label: string, uri: string, line: number): void {
  const allowed = 'abcdefghijklmnopqrstuvwxyz0123456789.-_';
  if (
    value.length === 0 ||
    value.startsWith('.') ||
    value.endsWith('.') ||
    [...value].some((character) => !allowed.includes(character))
  ) {
    throw new CatalogValidationError(
      `${uri}:${line} ${label} "${value}" must contain lowercase letters, digits, dots, hyphens, or underscores.`,
    );
  }
}

async function listFeatureFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFeatureFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.feature') ? [entryPath] : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right));
}
