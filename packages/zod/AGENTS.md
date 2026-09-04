# packages/zod instructions

## Purpose

Authoritative structured application data schemas and inferred types.

## Required boundaries

Keep browser-safe exports separate from server-only provider/persistence schemas.

Do not duplicate DTO types or expose server-only contracts to frontend imports.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
