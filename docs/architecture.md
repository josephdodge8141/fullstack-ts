# Architecture

`fullstack-ts` is a snapshot factory for small CRUD applications with one React frontend and one Node backend. Every generated repository is independent and its owner may change any rule.

All product and meaningful factory work starts in `packages/cucumber/features`. The same stable scenario cases are accounted for by backend and frontend adapters. Factory mechanics have their own adapter. The deployed browser agent reads those canonical behaviors independently; it does not receive implementation source or Playwright selectors.

Structured application data comes from `@app/schemas`. The backend follows routes → controllers → services → config-supplied connections. React pages own most view behavior, while frontend services are restricted to HTTP transport and response validation. Local dependencies and preview containers are declared once in `docker-compose.yaml`.

CDK creates permanent shared foundations and enrolls repositories. Ordinary pull-request deployments use versioned runtime commands against that foundation. A preview is owned by immutable repository ID, pull-request number and generation. The lifecycle controller is the only writer for preview DNS and uses durable ownership records before mutation.

See `CLAUDE.md` or `AGENTS.md` for contribution rules and the other files in this directory for the supported preview and initialization contracts.
