---
name: port-github-aws
description: Port a verified fullstack-ts repository and its IaC-defined AWS infrastructure from personal GitHub and AWS accounts into company-owned accounts, with CLI inventory, explicit human checkpoints, verification, and rollback. Use for account-to-account promotion, not routine deployment within one account.
---

# Port GitHub and AWS ownership

Treat the port as a reproducible promotion of a verified revision, repository configuration, and infrastructure definition. Do not treat it as permission to copy every live resource, secret, dataset, issue, package, or account-level setting.

Read the repository's root instructions, `README.md`, `package.json`, relevant feature files, `docs/initialization.md`, `docs/aws-preview-adapter.md`, `docs/production.md`, and the actual infrastructure and workflow files before proposing commands. Repository owners may change the template after this skill is packaged; actual files and scripts win over this guidance.

The shipped template contains local Compose behavior, dynamic ECS preview code, GitHub Actions, delivery identity CDK, and dedicated dev/prod CDK. Their presence does not prove any account was enrolled or a live lifecycle completed. Inspect actual deployment evidence before planning a transfer.

## Establish scope and identities

Collect only decisions not already available:

- source and target GitHub owner/repository, visibility, and copy-versus-transfer intent;
- source and target AWS CLI profiles, exact account IDs, regions, and stack names;
- the verified source commit and required proof commands;
- whether Git history, Git LFS, releases, issues, packages, environments, rulesets, variables, and Actions secrets are in scope;
- whether AWS data, immutable images, DNS, certificates, identity providers, and external integrations are in scope;
- the desired cutover window and rollback condition.

Default to copying a verified snapshot into a new company repository and recreating infrastructure from IaC in a new target stack. Leave personal source systems intact. A GitHub repository transfer, data migration, DNS cutover, or source cleanup is a separate explicit choice.

Run the read-only inventory helper from the loaded skill directory before planning mutations:

```sh
bash .claude/skills/port-github-aws/scripts/inventory.sh \
  --source-repo personal-owner/repository \
  --target-repo company-owner/repository \
  --source-profile personal \
  --target-profile company \
  --source-region us-east-1 \
  --target-region us-east-1 \
  --source-stack FullstackTsPreviewFoundation \
  --target-stack CompanyPreviewFoundation
```

Use the equivalent `.agents` path when that is the loaded skill tree. The helper never mutates GitHub or AWS and never reads secret values. Keep captured inventory outside tracked source because account IDs, domains, resource names, and repository settings may be private.

Pause for human confirmation after presenting the resolved identities, verified revision, scope, known omissions, and ordered mutation plan. Do not continue if either AWS account ID is ambiguous, the target repository contains unexpected refs, the selected source revision is not proven, or a resource cannot be tied to IaC or an explicit migration decision.

## Promote GitHub

Read [references/github.md](references/github.md) before GitHub changes.

Run the repository's actual clean verification commands before promotion. For this shipped template they are `npm ci`, `npm run check`, and `npm run proof:clean-clone`; `npm run proof:docker` is the explicit Docker proof. Require a clean tracked tree and record the exact commit SHA that passed.

Prepare the exact `gh` and `git` commands, target visibility, default branch, settings map, and items that cannot be copied. Pause immediately before creating, transferring, or writing to the target repository. A prior approval for the exact presented plan remains valid; do not repeatedly ask for the same approval.

Preserve branches and tags only when requested. Use a temporary bare clone for a history-preserving copy. Use `git push --mirror` only after proving the target is new and empty because it can delete or overwrite target refs. If the target is nonempty, stop and present a non-destructive reconciliation plan.

GitHub never reveals Actions secret values. List names only, have the human supply or rotate values through an approved channel, and write them with `gh secret set` only after the target environments and trust policy exist. Treat deploy keys, webhooks, GitHub Apps, packages, releases, issues, pull requests, and environment approvals as separate migration objects; a Git push does not move them.

Verify the target default-branch commit, requested branches/tags, visibility, rulesets or protection, Actions permissions, environments, variables, and secret names. Do not call the GitHub side complete while required checks reference workflows that are absent or have not run on the target revision.

## Recreate AWS infrastructure

Read [references/aws.md](references/aws.md) before AWS changes.

Use named profiles on every AWS CLI or CDK command and print `aws sts get-caller-identity` immediately before a target mutation. Never rely on whichever account happens to be the shell default. Build a source-to-target resource map that marks each item as recreate, import, migrate data, replace, external prerequisite, or intentionally omit.

For this template, synthesize with the target application name and exact target repository identity; the preview child zone is created by the foundation. Physical IDs and ARNs from the personal account are evidence, not target configuration. Inspect target-account prerequisites such as CDK bootstrap resources, hosted zones and delegation, certificates, GitHub OIDC providers and roles, secrets, model access, quotas, and service-linked roles.

Run credential-free synthesis, then run a target-profile CDK diff. Present the target account ID, region, stack name, diff, retained-resource implications, estimated service impact, and rollback before requesting the deployment checkpoint. Bootstrap changes, IAM or security-group broadening, resource replacement, data transfer, image copying, and DNS cutover deserve explicit attention.

Deploy only the approved target stack and parameters. Verify CloudFormation completion, stack outputs, tags, ECR immutability, DynamoDB billing and ownership expectations, log retention, task-execution-role scope, VPC/subnets/security group, hosted-zone reference, and application proof supported by the actual repository. Do not claim a live preview from synthesis alone.

Prefer rebuilding immutable images from the verified target commit. Treat DynamoDB or other application data as a distinct migration with validation and rollback; never infer it from the word infrastructure. Historical logs normally remain in the source account. Keep source resources available until target verification and any approved cutover are complete.

## Cut over and finish

Before DNS, identity-provider callback, GitHub required-check, or traffic changes, show the exact mutation, expected propagation, health signal, rollback command, and maximum observation window. Pause for the cutover checkpoint. Test the company-owned path independently; do not use the personal deployment as proof of the target.

Finish with a concise ledger containing:

- source and target GitHub repositories and commit SHAs;
- source and target AWS account IDs, regions, and stack names;
- proof commands and observed results;
- settings and resources recreated, migrated, omitted, or awaiting human secret entry;
- cutover status and rollback route;
- personal resources deliberately left intact.

Never delete, archive, disable, or transfer the personal source repository or AWS resources unless the human separately authorizes those exact cleanup targets after the company-owned result is verified.
