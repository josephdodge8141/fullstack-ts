# .github/workflows instructions

## Purpose

Checks, preview deployment, browser verification, cleanup and explicit foundation setup workflows.

## Required boundaries

Preserve candidateSha/controlSha and admitted-attempt identity across workflow boundaries.

Never infer the tested commit from a follow-up workflow default SHA or turn skipped/canceled work into success.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
