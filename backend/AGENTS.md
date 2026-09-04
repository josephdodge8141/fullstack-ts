# backend instructions

## Purpose

The Express application and its required transport-to-service layers.

## Required boundaries

Keep app assembly injectable and process startup in index.ts.

Acceptance may replace only outbound config connections, never controllers, middleware, or services.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
