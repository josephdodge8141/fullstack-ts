---
name: adversarial-feature-review
description: Challenge behavior scope, adverse cases and unjustified layer or browser no-ops.
---

# adversarial-feature-review

Read `CLAUDE.md`, the target folder instructions, and `packages/cucumber/features` before work. Confirm the exact feature/case IDs and accepted boundaries. Write or revise behavior and failing steps/tests before implementation when behavior changes. Keep edits within the selected layer.

Apply the root reuse rule exactly: one use stays local, two uses remain duplicated, and three compatible production callers justify extraction only when every caller can exercise the entire input/output behavior. Infrastructure is exempt.

Run focused checks, then the root gate relevant to the work. Report commands actually run and any missing live evidence. Never add suppression directives, personal configuration, fabricated no-ops or claims about checks that did not execute.
