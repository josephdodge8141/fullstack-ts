# AWS preview adapter

`infra/runtime/compose.ts` validates normalized Compose; `protocol.ts` defines transitions; `controller.ts` persists generation state; `aws-preview.ts` applies ECS, DynamoDB, Route 53, and EC2 effects; `preview-cli.ts` is the workflow entry point. The permanent foundation is `infra/foundation/stack.ts`. Ordinary PR previews do not run CDK.

The shipped workflow boundary is `pull-request.yml` for unprivileged code/image candidates, `trusted-preview.yml` for exact-SHA verified admission and deployed browser checks, and `preview-cleanup.yml` for close and scheduled reconciliation. The foundation and OIDC enrollment sequence is in `.claude/skills/fullstack-aws-delivery/references/enrollment.md`. Run live proof before claiming it operates in an account.
