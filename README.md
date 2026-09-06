# fullstack-ts

Opinionated TypeScript starter: React, Node, shared Zod contracts, Cucumber behavior-first development, and a bounded preview lifecycle reducer.

Wave 1 establishes the shared catalog, backend health endpoint, frontend Hello World, source-policy gate, and a provider-free preview state machine. It does not yet ship Compose startup, authentication, preview adapters, CDK, CI workflows, or cloud deployment.

The later local-first order is: make Compose dependencies runnable, add local authentication and application behavior, connect preview adapters to the reducer, then add permanent infrastructure and automation. Run `npm run check` for the current repository gate.
