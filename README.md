# fullstack-ts

Opinionated TypeScript starter: React, Node, shared Zod contracts, Cucumber behavior-first development, and a bounded preview lifecycle reducer.

Wave 2 adds a credential-free local slice: Caddy, Keycloak backed by Postgres, backend OIDC/session handling, and frontend signup, login, and logout. Public Hello World and `/api/v1/health` remain available without a session.

Run `docker compose up --build`, then open [http://app.localhost:8088](http://app.localhost:8088). The checked-in realm import and `.env.example` use local dummy credentials only. To exercise the real stack browser coverage, run `npm run test:browser:compose -w @app/frontend` while Compose is running. Run `npm run check` for the current repository gate.

The later local-first order is: connect preview adapters to the reducer, then add permanent infrastructure and automation.
