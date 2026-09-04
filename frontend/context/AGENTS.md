# frontend/context instructions

## Purpose

Shared React context data consumed in at least three production locations.

## Required boundaries

Keep provider value and mutation semantics consistent for all consumers.

Do not use context to avoid local state or to share an almost-common shape.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
