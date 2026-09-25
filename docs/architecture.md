# Architecture

Canonical application behaviors are in `packages/cucumber/features`; shared Zod contracts are in `@app/schemas`. Local Compose runs Caddy, React, and Express. The starter is public and auth-free.

CDK defines a permanent preview foundation plus dedicated dev/prod application stacks. PR preview tasks, task definitions, and A records are dynamic generation-owned resources managed by `infra/runtime`. The Compose compiler rejects unsupported semantics. Dev/prod use Lambda Web Adapter for the Express backend and CloudFront origin access control for a private S3 frontend. The GitHub Actions suite builds unprivileged PR candidates, admits exact-SHA previews through trusted control code, reconciles expiry, and promotes immutable main releases from dev to prod.

See `.claude/skills/fullstack-aws-delivery/SKILL.md` for enrollment and proof. Checked-in infrastructure is not proof of a deployed account.
