# fullstack-ts

An auth-free TypeScript starter with React, Express, shared Zod contracts, and canonical Cucumber behaviors. `docker compose up --build` runs Caddy, frontend, and backend locally. Open `http://app.localhost:8088` for Hello World and `http://app.localhost:8088/api/v1/health` for `{"status":"ok"}`.

The frontend includes the pinned shadcn/ui Base UI catalog with Tailwind CSS v4. The fixed source lives in `frontend/components/ui`; `frontend/ui-foundation.json` records its export inventory. Curated components in `frontend/design-system` add data grid, date and time pickers, tree and transfer lists, controls, navigation, layout primitives, a workspace shell, and nine page layouts. `frontend/design-system/catalog.json` records the extensions. Open `http://app.localhost:8088/components` for links to working examples. The [component system plan](docs/frontend-component-system-plan.md) tracks depth and motion coverage. The twenty visual briefs remain open in [the brief plan](docs/design-system-briefs-plan.md).

`npm ci && npm run check` runs the repository gate. `npm run proof:clean-clone` verifies a clean generated snapshot; `npm run proof:docker` adds the real Compose and browser proof. The default starter has no auth or sample CRUD flow. DynamoDB is provisioned for dedicated application stages but unused by the Hello World app.

## AWS delivery

`compose.yaml` is the local dependency source. `docker compose config --format json` is validated by `infra/runtime/compose.ts` and compiled into one bounded ECS/Fargate task for each PR preview. The compiler rejects unsupported Compose semantics. `FullstackTsPreviewFoundation` is the permanent CDK foundation; ordinary previews use `infra/runtime/preview-cli.ts` and expire four hours after first successful HTTPS health. `FullstackTs-dev` and `FullstackTs-prod` are separate CDK application stacks with Lambda, API Gateway, DynamoDB, private S3, and CloudFront. Main-branch delivery promotes the same image digest and frontend archive after dev verification.

The checked-in Actions and CDK require owner enrollment before any live deployment. Use `.claude/skills/fullstack-aws-delivery/SKILL.md` for the ordered AWS, GitHub, and Cloudflare setup and live proof. Hosts follow `pr-<number>.preview.<project>.joedodge.dev`, `dev.<project>.joedodge.dev`, and `prod.<project>.joedodge.dev`, where `<project>` is `applicationName`. Do not commit account IDs, hosted-zone IDs, certificates, or credentials.
