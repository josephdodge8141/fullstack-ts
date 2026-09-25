# Preview operations

The unprivileged `pull_request` workflow runs the code gate and packages candidate images and normalized Compose. The trusted `workflow_run` verifies the artifact, run, immutable repository ID, PR, and current head SHA before AWS credentials. It validates Compose, publishes digest-pinned images, admits one Fargate task, checks HTTPS health, runs deployed Cucumber and Playwright, then publishes `factory/preview` on that exact SHA. `factory/code` and `factory/preview` become required checks during enrollment.

The first successful health fixes expiry four hours later. Replaying the same SHA does not extend it. A newer SHA replaces the active generation after ownership checks. `preview-cleanup.yml` closes PRs and sweeps every fifteen minutes for expiry or failed startup; it retries partial cleanup. Inspect generation receipts and ECS tags before manual action. The Route 53 child zone is `preview.<project>.joedodge.dev`; Cloudflare delegates it with NS records.

Run `node --import tsx infra/runtime/compose-cli.ts <normalized-compose.json>` to validate a candidate. `infra/runtime/preview-cli.ts` implements admit, close, reconcile, and sweep using the exact environment variables in the workflows. See `.claude/skills/fullstack-aws-delivery/references/lifecycle.md` for the ownership and evidence contract.
