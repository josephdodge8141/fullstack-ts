# frontend/utils instructions

## Purpose

Pure individual frontend helpers that meet the exact reuse threshold.

## Required boundaries

Extract only for three compatible production callers.

Do not put components, hooks, API calls, context or two-use similarities here.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
