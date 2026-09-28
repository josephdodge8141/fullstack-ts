---
name: product-behaviors
description: Turn approved product research into a small, testable inventory of user behaviors before building a generated fullstack-ts application.
---

# Product behaviors

Use this after the product edge and business plan are approved, before application implementation. Read the repository's `AGENTS.md`, the existing `packages/cucumber/features`, `feature-authoring`, and `adversarial-feature-review` instructions.

Derive the MVP from what a user needs to do, not from a list of screens or technical components. Record each user goal, actor, trigger, successful outcome, and the adverse cases that would make the feature misleading or unusable. Keep a trace from the approved research and plan to each proposed behavior; flag unsupported assumptions for owner review.

Write the smallest coherent set of canonical Cucumber application scenarios in `packages/cucumber/features/application`. Give every scenario a stable case identity. Include meaningful failure and boundary cases. Review the inventory against the promised product edge, and use `adversarial-feature-review` to challenge omissions and unjustified layer no-ops. Do not duplicate feature text in a second source of truth.

Implement or update backend and frontend steps as the root instructions require, run the relevant behavior suites, and record the failing result before application implementation. Then hand the behavior inventory and red results to the build agent. The build is ready for local review only when every selected behavior has a passing backend and frontend report, or an explicit justified layer no-op, plus the repo's required gates.
