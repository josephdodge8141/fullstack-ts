# .github instructions

## Purpose

Repository automation and trusted workflow policy.

## Required boundaries

Keep workflow permissions job-scoped and pin third-party actions.

Never execute candidate-controlled code with deployment, inference, or status-write credentials.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
