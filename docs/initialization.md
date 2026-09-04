# Initialization

A generated repository starts locally with `docker compose up`; no `.env` copy or cloud credentials are required for the public Hello World and health route.

Cloud preview initialization is a separate, explicit operation. It validates the repository and account configuration, checks or creates the compatible shared foundation, enrolls the immutable repository identity, configures GitHub OIDC roles and the preview child hosted zone, verifies the selected Bedrock model, and proves an actual preview before installing the required `factory/preview` status.

The public template contains generic `.env.example` values. Account IDs, hosted-zone IDs, repository settings and synthetic preview credentials belong in repository variables, environments or secrets. Rerunning initialization must inspect and reuse compatible resources rather than create duplicates.

Use `.claude/skills/initialize/SKILL.md` when it exists in a generated repository. It records the exact commands and required evidence for the shipped version.
