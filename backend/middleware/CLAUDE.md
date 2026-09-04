# backend/middleware instructions

## Purpose

Transport concerns such as identity establishment, CSRF, logging, limits and error mapping.

## Required boundaries

Attach validated identity and map typed errors without leaking internals.

Do not own domain actions or import controller/route implementations.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
