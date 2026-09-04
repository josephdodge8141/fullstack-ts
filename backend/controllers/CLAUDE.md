# backend/controllers instructions

## Purpose

HTTP request validation, service invocation, response validation and status selection.

## Required boundaries

Use shared Zod schemas and typed domain errors.

Do not import drivers or perform business calculations, queries, or data-dependent authorization.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
