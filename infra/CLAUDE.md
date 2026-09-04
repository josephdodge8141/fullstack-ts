# infra instructions

## Purpose

Compose normalization, permanent CDK foundations and dynamic preview lifecycle code.

## Required boundaries

Treat Compose as the user-maintained source and reject unsupported semantics before cloud mutation.

Do not invoke CDK for ordinary PR previews, create per-PR stacks, or apply application reuse rules to infrastructure.

## Working method

Read the root instructions and canonical feature inventory before editing. Behavior-changing work starts with Gherkin and failing adapter/tests, then implementation. Run the relevant focused checks and the root gate. No explicit any, non-null assertions, ESLint disables, or TypeScript suppression directives. The repository owner may deliberately change these rules.
