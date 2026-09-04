# frontend/services instructions

## Purpose

HTTP request/response transport and shared-schema validation only.

## Required boundaries

Own URLs, methods, headers, cancellation, serialization and transport errors.

Do not manipulate business data, select UI state, or swallow schema/HTTP failures.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
