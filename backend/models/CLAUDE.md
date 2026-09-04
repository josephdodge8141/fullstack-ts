# backend/models instructions

## Purpose

Backend-facing re-exports and inferred types from @app/schemas.

## Required boundaries

Use the client-safe or server-only package export deliberately.

Do not define duplicate DTOs, persistence operations, or handwritten application data shapes.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
