# frontend/pages instructions

## Purpose

Top-level visual layouts and most feature-specific behavior.

## Required boundaries

Prefer clear large pages over premature fragments; use services for transport.

Do not call fetch directly or treat file length as a defect.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
