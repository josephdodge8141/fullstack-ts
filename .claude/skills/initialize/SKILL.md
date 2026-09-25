---
name: initialize-fullstack-ts
description: Initialize a repository generated from fullstack-ts and verify the auth-free local Compose starter before optional AWS delivery enrollment.
---

# Initialize fullstack-ts

Read the generated repository's instructions, README, package scripts, canonical Cucumber features, and Compose before acting. Owners may change their snapshot. Use the actual shipped commands and files. Reuse decisions and authorization already present in the conversation.

The default starter serves Hello World and `/api/v1/health` without credentials, an account, or an identity provider. Run `npm ci`, `npm run check`, and `npm run proof:clean-clone`. When Docker is available, run `npm run proof:docker`; this verifies real Compose startup and browser behavior. Inspect the resolved local URL from Compose. Do not add a CRUD sample or provider dependency during onboarding.

Record `applicationName` as the project slug. Keep AWS account/region, hosted-zone IDs, certificate ARNs, IAM role ARNs, repository settings, and secrets in owner configuration rather than tracked template source. The domain convention `joedodge.dev` is intentionally fixed by this factory. Check the generated repository's actual Compose translator before claiming a service or peripheral is previewable.

For requested AWS/GitHub/Cloudflare enrollment, use `fullstack-aws-delivery` and its enrollment reference. The checked-in workflows, CDK, and runtime scripts are implementation; their existence does not establish deployed resources. Inspect, reuse compatible infrastructure, deploy, and verify a real PR preview and dev/prod release before reporting completion. Keep the independent Bedrock browser agent outside the delivery gate unless the owner requests it.
