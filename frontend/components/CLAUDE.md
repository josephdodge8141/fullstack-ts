# frontend/components instructions

## Purpose

Shared visual UI with identical use in at least three production callers.

## Required boundaries

Accept a complete common input/output contract.

Do not extract one- or two-use fragments or callers that cannot exercise the full component behavior.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
