# backend/routes instructions

## Purpose

Versioned route registration and middleware ordering.

## Required boundaries

Delegate request handling to controllers.

Do not query data, construct providers, or implement domain behavior.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
