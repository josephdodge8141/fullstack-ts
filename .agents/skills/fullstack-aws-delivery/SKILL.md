---
name: fullstack-aws-delivery
description: Enroll and operate this fullstack-ts repository's Compose-derived four-hour ECS PR previews and separate CDK dev/prod delivery through AWS, GitHub Actions, and Cloudflare.
---

# Fullstack AWS delivery

Use this skill for enrollment, preview operations, or dev/prod delivery in a repository generated from this factory. Read the actual repository instructions, Compose file, CDK, workflows, and scripts first. An older generated repository may not contain every capability listed here; report the gap rather than treating these instructions as deployed infrastructure. The application owner can change the template.

## Route work to the shipped concepts

- Use `initialize-fullstack-ts` for the clean local clone and Docker proof.
- Use `infrastructure` when changing Compose translation, CDK, or dynamic preview code.
- Use `preview-operations` for generation inspection and cleanup.
- Use `browser-agent` only when the owner separately enables the independent Bedrock agent. The required delivery gate is Cucumber, Playwright, and the live preview result; visual audits remain local.
- Use `port-github-aws` for account-to-account migration rather than ordinary delivery.

Read [references/enrollment.md](references/enrollment.md) before touching AWS, GitHub settings, certificates, or Cloudflare. Read [references/lifecycle.md](references/lifecycle.md) before admitting, replacing, expiring, or cleaning a preview. Read [references/release.md](references/release.md) before changing dev/prod delivery.

## Non-negotiable contract

`compose.yaml` is the complete local run. `docker compose config --format json` feeds `infra/runtime/compose.ts`; its accepted subset maps exactly one Caddy router, frontend, and backend into one Fargate task. Never infer support for a new sidecar, volume, port, secret, event, auth, email, or cache feature. Extend the compiler, provider, feature, tests, and application CDK only when the generated application declares it. A rejected Compose field is a stop, not an invitation to silently omit it.

`applicationName` is the project slug. Hosts are `pr-<number>.preview.<project>.joedodge.dev`, `dev.<project>.joedodge.dev`, and `prod.<project>.joedodge.dev`. Keep account IDs, hosted-zone IDs, certificate ARNs, credentials, and other owner-specific values out of tracked source. CloudFront certificates must be in `us-east-1`.

PR previews use dynamic commands against permanent CDK foundations. The lifecycle identity is immutable repository ID, PR number, exact head SHA, and generation. Images use ECR digests. A generation's expiry is exactly four hours after its first successful HTTPS health check; replaying the same SHA cannot renew it. Scheduled reconciliation must finish missed close, expiry, and partial cleanup. Never delete a DNS value or ECS task belonging to a newer generation.

Dev and prod are separate CDK application stacks with independent DynamoDB tables, Lambda/API Gateway backends, and private S3/CloudFront frontends. Production requires an available table backup before updating an existing table. Automatic promotion uses the exact backend image digest and frontend archive that passed dev. A green workflow alone does not prove the live lifecycle: inspect task, definition, ENI, DNS, browser results, four-hour absence, and exact production artifacts.

## Finish with evidence

Report local checks, synthesized stacks, workflow runs, public HTTPS checks, and cleanup evidence separately. Name work that remains unenrolled or unproven. Do not say a future instruction or synthesized template is deployed capability.
