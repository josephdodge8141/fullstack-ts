import { z } from 'zod';

export const revisionShaSchema = z.string().regex(/^[a-f0-9]{40,64}$/);

export const browserExecutionIdentitySchema = z.strictObject({
  candidateSha: revisionShaSchema,
  deploymentGeneration: z.string().trim().min(1).max(200),
  workflowRunId: z.string().regex(/^[1-9][0-9]*$/),
  workflowRunAttempt: z.number().int().positive(),
});

export const browserCaptureSchema = browserExecutionIdentitySchema.extend({
  id: z.string().trim().min(1).max(200),
  kind: z.enum(['screenshot', 'accessibility', 'page-text', 'browser-diagnostic']),
  redacted: z.literal(true),
  locator: z.string().regex(/^workflow-artifact:\/\/[a-z0-9][a-z0-9._/-]*$/i),
  contentDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export const browserCaptureRegistrySchema = z.strictObject({
  schemaVersion: z.literal(1),
  captures: z.array(browserCaptureSchema),
});

// Retained as a public compatibility export. Browser reports no longer accept this
// metadata; only the separately trusted capture registry does.
export const browserEvidenceSchema = browserCaptureSchema;

export const browserCaseResultSchema = z.strictObject({
  caseId: z.string().trim().min(1),
  outcome: z.enum(['passed', 'failed', 'noop', 'uncertain']),
  reason: z.string().trim().min(1).max(2_000),
  evidenceRefs: z.array(z.string().trim().min(1).max(200)),
});

export const browserReportSchema = browserExecutionIdentitySchema.extend({
  schemaVersion: z.literal(1),
  cases: z.array(browserCaseResultSchema),
});

export type BrowserExecutionIdentity = z.infer<typeof browserExecutionIdentitySchema>;
export type BrowserCapture = z.infer<typeof browserCaptureSchema>;
export type BrowserCaptureRegistry = z.infer<typeof browserCaptureRegistrySchema>;
export type BrowserEvidence = BrowserCapture;
export type BrowserCaseResult = z.infer<typeof browserCaseResultSchema>;
export type BrowserReport = z.infer<typeof browserReportSchema>;
