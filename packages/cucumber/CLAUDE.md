# packages/cucumber instructions

## Purpose

The canonical feature inventory, case catalog and normalized result contracts.

## Required boundaries

Use the upstream Gherkin parser/compiler; match exact stable case sets and preserve examples/backgrounds.

Do not copy features, infer correspondence from totals, or count no-ops as exercised.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
