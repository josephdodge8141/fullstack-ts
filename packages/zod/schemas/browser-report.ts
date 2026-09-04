import { z } from 'zod';

export const revisionShaSchema = z.string().regex(/^[a-f0-9]{40,64}$/);

export const browserExecutionIdentitySchema = z.strictObject({
  candidateSha: revisionShaSchema,
  deploymentGeneration: z.string().trim().min(1).max(200),
  workflowRunId: z.string().regex(/^[1-9][0-9]*$/),
  workflowRunAttempt: z.number().int().positive(),
});

export const browserEvidenceSchema = z.strictObject({
  id: z.string().trim().min(1).max(200),
  kind: z.enum(['screenshot', 'accessibility', 'page-text', 'browser-diagnostic']),
  redacted: z.boolean(),
});

export const browserCaseResultSchema = z.strictObject({
  caseId: z.string().trim().min(1),
  outcome: z.enum(['passed', 'failed', 'noop', 'uncertain']),
  reason: z.string().trim().min(1).max(2_000),
  evidenceRefs: z.array(z.string().trim().min(1).max(200)),
});

export const browserReportSchema = browserExecutionIdentitySchema.extend({
  schemaVersion: z.literal(1),
  capturedEvidence: z.array(browserEvidenceSchema),
  cases: z.array(browserCaseResultSchema),
});

export type BrowserExecutionIdentity = z.infer<typeof browserExecutionIdentitySchema>;
export type BrowserEvidence = z.infer<typeof browserEvidenceSchema>;
export type BrowserCaseResult = z.infer<typeof browserCaseResultSchema>;
export type BrowserReport = z.infer<typeof browserReportSchema>;
