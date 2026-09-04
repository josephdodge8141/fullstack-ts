# frontend/hooks instructions

## Purpose

Shared React logic used with the entire same contract in at least three production callers.

## Required boundaries

Keep one-use logic in its page and same-file reuse local.

Do not hide API transport or extract optional behavior some callers never use.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
