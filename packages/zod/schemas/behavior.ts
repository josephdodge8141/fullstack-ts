import { z } from 'zod';

export const behaviorCategorySchema = z.enum(['application', 'factory']);
export const behaviorLayerSchema = z.enum(['backend', 'frontend', 'factory']);

export const catalogStepArgumentSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('docString'),
    content: z.string(),
    mediaType: z.string().optional(),
  }),
  z.strictObject({
    type: z.literal('dataTable'),
    rows: z.array(z.array(z.string())),
  }),
]);

export const catalogStepSchema = z.strictObject({
  keyword: z.string(),
  text: z.string(),
  argument: catalogStepArgumentSchema.optional(),
});

export const catalogBackgroundSchema = z.strictObject({
  name: z.string(),
  description: z.string(),
  steps: z.array(catalogStepSchema),
});

export const behaviorNoopsSchema = z.strictObject({
  backend: z.string().trim().min(1).optional(),
  frontend: z.string().trim().min(1).optional(),
  browser: z.string().trim().min(1).optional(),
});

export const catalogExampleSchema = z.strictObject({
  name: z.string(),
  description: z.string(),
  values: z.record(z.string(), z.string()),
});

export const behaviorCaseSchema = z.strictObject({
  id: z.string().trim().min(1),
  scenarioId: z.string().trim().min(1),
  caseId: z.string().trim().min(1).optional(),
  example: catalogExampleSchema.optional(),
  pickleId: z.string().trim().min(1),
  category: behaviorCategorySchema,
  factoryApplicable: z.boolean(),
  featureName: z.string().trim().min(1),
  featureDescription: z.string(),
  ruleName: z.string().trim().min(1).optional(),
  ruleDescription: z.string().optional(),
  scenarioName: z.string().trim().min(1),
  scenarioDescription: z.string(),
  sourceUri: z.string().trim().min(1),
  sourceLine: z.number().int().positive(),
  tags: z.array(z.string().trim().min(1)),
  backgrounds: z.strictObject({
    feature: catalogBackgroundSchema.optional(),
    rule: catalogBackgroundSchema.optional(),
  }),
  steps: z.array(catalogStepSchema),
  noops: behaviorNoopsSchema,
  browserNoopEligible: z.boolean(),
});

export const behaviorCatalogSchema = z.strictObject({
  schemaVersion: z.literal(1),
  cases: z.array(behaviorCaseSchema),
  pickleIdToCaseId: z.record(z.string(), z.string().trim().min(1)),
});

export const cucumberResultStatusSchema = z.enum([
  'UNKNOWN',
  'PASSED',
  'SKIPPED',
  'PENDING',
  'UNDEFINED',
  'AMBIGUOUS',
  'FAILED',
]);

export const linkedCaseResultSchema = z.strictObject({
  caseId: z.string().trim().min(1),
  status: cucumberResultStatusSchema,
});

export const normalizedLayerResultSchema = z.strictObject({
  layer: behaviorLayerSchema,
  exercised: z.array(
    z.strictObject({
      caseId: z.string().trim().min(1),
      status: z.literal('passed'),
    }),
  ),
  noops: z.array(
    z.strictObject({
      caseId: z.string().trim().min(1),
      reason: z.string().trim().min(1),
    }),
  ),
  counts: z.strictObject({
    expected: z.number().int().nonnegative(),
    exercised: z.number().int().nonnegative(),
    noop: z.number().int().nonnegative(),
  }),
});

export type BehaviorCategory = z.infer<typeof behaviorCategorySchema>;
export type BehaviorLayer = z.infer<typeof behaviorLayerSchema>;
export type CatalogStepArgument = z.infer<typeof catalogStepArgumentSchema>;
export type CatalogStep = z.infer<typeof catalogStepSchema>;
export type CatalogBackground = z.infer<typeof catalogBackgroundSchema>;
export type BehaviorNoops = z.infer<typeof behaviorNoopsSchema>;
export type CatalogExample = z.infer<typeof catalogExampleSchema>;
export type BehaviorCase = z.infer<typeof behaviorCaseSchema>;
export type BehaviorCatalog = z.infer<typeof behaviorCatalogSchema>;
export type CucumberResultStatus = z.infer<typeof cucumberResultStatusSchema>;
export type LinkedCaseResult = z.infer<typeof linkedCaseResultSchema>;
export type NormalizedLayerResult = z.infer<typeof normalizedLayerResultSchema>;
