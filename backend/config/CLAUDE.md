# backend/config instructions

## Purpose

Environment validation and construction/lifecycle of databases and external providers.

## Required boundaries

Expose narrow connection contracts to services and close them during shutdown.

Do not contain routes, HTTP response logic, or business decisions.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
