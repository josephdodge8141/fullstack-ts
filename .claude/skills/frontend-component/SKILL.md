---
name: frontend-component
description: Maintain the fixed shadcn/ui base and create qualifying application compositions after exact reuse.
---

# frontend-component

Read `CLAUDE.md`, the target folder instructions, and `packages/cucumber/features` before work. Confirm the exact feature/case IDs and accepted boundaries. Write or revise behavior and failing steps/tests before implementation when behavior changes. Keep edits within the selected layer.

Treat `frontend/components/ui` as the pinned, fixed shadcn/ui foundation. It is exempt from the caller-count rule and closed to additions, including new upstream catalog entries; reviewed upgrades may update existing files. Put curated general design-system extensions in `frontend/design-system`, also exempt from caller counting. Put application-created reusable compositions in `frontend/components/app` only after three compatible production callers can exercise their entire input/output behavior. One use stays local and two uses remain duplicated. Never place additions in `ui/`.

Run focused checks, then the root gate relevant to the work. Report commands actually run and any missing live evidence. Never add suppression directives, personal configuration, fabricated no-ops or claims about checks that did not execute.
