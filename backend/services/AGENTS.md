# backend/services instructions

## Purpose

All business logic, data operations, collection and data-dependent authorization.

## Required boundaries

Use config-supplied connections and return domain results/errors without Express types.

Do not select HTTP statuses, create connections, or introduce circular service dependencies.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
