# tooling instructions

## Purpose

Deterministic repository gates, factory acceptance and browser-agent adapters.

## Required boundaries

Fail closed on malformed/missing/uncertain results and state exactly what a gate proves.

Do not claim caller-count/TDD chronology enforcement or give browser agents shell/database shortcuts.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
