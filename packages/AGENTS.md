# packages instructions

## Purpose

Private shared workspace packages for structured schemas and canonical behavior.

## Required boundaries

Keep them independent of application and infrastructure production code.

Do not create extra shared packages without an explicit contract need.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
