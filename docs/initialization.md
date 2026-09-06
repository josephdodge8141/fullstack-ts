# Initialization

A generated repository starts locally with `docker compose up`; no `.env` copy or cloud credentials are required for the public Hello World and health route.

Cloud preview initialization will be a separate, explicit operation. The current repository can validate and synthesize the generic permanent foundation with `npm run synth:foundation`; it does not deploy, inspect an AWS account, delegate DNS, enroll GitHub, configure OIDC, verify a Bedrock model or prove a live preview.

The initialization adapter must eventually validate repository and account configuration, inspect or create a compatible foundation, enroll the immutable repository identity, configure narrowly scoped GitHub OIDC roles, verify the existing preview child hosted zone and selected Bedrock model, and prove an actual preview before installing the required `factory/preview` status. See `aws-preview-adapter.md` for the resource and permission boundary.

The public template contains generic `.env.example` values. Account IDs, hosted-zone IDs, repository settings and synthetic preview credentials belong in repository variables, environments or secrets. Rerunning initialization must inspect and reuse compatible resources rather than create duplicates.

Use `.claude/skills/initialize/SKILL.md` when it exists in a generated repository. It records the exact commands and required evidence for the shipped version.
