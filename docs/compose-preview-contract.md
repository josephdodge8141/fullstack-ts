# Compose preview contract

Docker Compose is the complete local run. The preview compiler consumes `docker compose config --format json`, checks the `x-preview` extension, and accepts this starter's Caddy router, frontend, and backend in one Fargate task. Caddy alone exposes public ports. The local Caddyfile bind mount is explicitly declared as local-only; `infra/runtime/Dockerfile.router` copies that same file into the preview image. Unsupported fields, services, networks, mounts, capabilities, or secrets fail before cloud mutation; the compiler does not silently omit them.

A generated application that adds dependencies must extend the compiler and provider contract, canonical factory behavior, and adapter tests before claiming preview support. CDK dev/prod peripherals are defined from that application's own requirements, not inferred from Compose.
