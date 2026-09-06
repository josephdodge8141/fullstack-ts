# fullstack-ts

Opinionated TypeScript starter: React, Node, shared Zod contracts, Cucumber behavior-first development, a bounded preview lifecycle reducer, and a minimal permanent AWS foundation.

Wave 2 adds a credential-free local slice: Caddy, Keycloak backed by Postgres, backend OIDC/session handling, and frontend signup, login, and logout. Public Hello World and `/api/v1/health` remain available without a session.

Run `docker compose up --build`, then open [http://app.localhost:8088](http://app.localhost:8088). The checked-in realm import and `.env.example` use local dummy credentials only. While Compose is running, `npm run test:behaviors:frontend:compose` executes every applicable frontend Cucumber case with exact 1:1 result accounting, and `npm run test:browser:compose -w @app/frontend` runs focused Playwright coverage. `npm run check` includes the corresponding backend Cucumber adapter and the repository gate.

The imported non-MFA test identity is `test-user@example.test` with password `a-long-cucumber-test-password`.

`npm run synth:foundation` synthesizes the generic permanent CDK foundation without credentials or AWS lookups. It does not deploy. The owned resources and strict boundary for a future dynamic preview adapter are documented in `docs/aws-preview-adapter.md`.
