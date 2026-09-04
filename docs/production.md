# Production

Production deployment is intentionally outside version one. A future design may use permanent ECS services and a repository-specific hostname such as `{repository}.prod.example.com`, but this repository does not provide, imply or test that lifecycle.

Do not adapt the ephemeral preview cleanup, expiry or data assumptions into a production promise without a separate behavior and infrastructure design.
