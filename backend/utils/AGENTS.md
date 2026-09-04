# backend/utils instructions

## Purpose

Pure lightweight helpers that meet the exact reuse threshold.

## Required boundaries

Extract only after three distinct production callers can use the entire same behavior.

Do not hide connections, mutable state, domain services, or two-call-site abstractions here.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
