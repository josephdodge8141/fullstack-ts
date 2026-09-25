# Initialization

The default starter is auth-free. Run `npm ci`, `npm run check`, `npm run proof:clean-clone`, and, with Docker, `npm run proof:docker`. The clean-clone proof exports tracked source into a temporary directory. The Docker proof boots the real Caddy/frontend/backend Compose run and exercises public behavior.

Cloud enrollment is a separate operation using `.claude/skills/fullstack-aws-delivery/SKILL.md`. The repository ships CDK, runtime commands, and Actions, but none of those files proves an AWS deployment or GitHub branch rule. Inspect identity and existing resources first, then follow the skill's AWS/GitHub/Cloudflare sequence and collect live lifecycle evidence.
