# fullstack-ts

An auth-free TypeScript starter with React, Express, shared Zod contracts, and canonical Cucumber behaviors. `docker compose up --build` runs Caddy, frontend, and backend locally. Open `http://app.localhost:8088` for Hello World and `http://app.localhost:8088/api/v1/health` for `{"status":"ok"}`.

The frontend includes the pinned shadcn/ui Base UI catalog with Tailwind CSS v4. The fixed source lives in `frontend/components/ui`; `frontend/ui-foundation.json` records its export inventory. Curated components in `frontend/design-system` add data grid, date and time pickers, tree and transfer lists, controls, navigation, layout primitives, a workspace shell, and nine page layouts. `frontend/design-system/catalog.json` records the extensions. Open `http://app.localhost:8088/components` for links to working examples. The [component system plan](docs/frontend-component-system-plan.md) tracks depth and motion coverage. Open `http://app.localhost:8088/design-systems` to switch among twenty token-driven design system presets (five dark-first); each preset is one editable CSS file in `frontend/design-system/themes/presets`, and `frontend/design-system/themes/main.css` maps them into every component. The [brief plan](docs/design-system-briefs-plan.md) records their intent.

`npm ci && npm run check` runs the repository gate. `npm run proof:clean-clone` verifies a clean generated snapshot; `npm run proof:docker` adds the real Compose and browser proof. The default starter has no auth or sample CRUD flow. DynamoDB is provisioned for dedicated application stages but unused by the Hello World app.

## Expo app

`mobile/` is an Expo workspace for iOS, Android, and Expo web. It renders the existing React pages and design-system components through an [Expo DOM component](https://docs.expo.dev/guides/dom-components/), so the Hello World screen, catalog, and design-system interactions use the same TypeScript source as the website. The native shell calls the existing Express backend for health. No second backend is started.

Build the contracts and backend, then run the API and Expo in separate terminals:

```sh
npm ci
npm run build:contracts && npm run build -w @app/backend
EXPO_WEB_ORIGIN=http://localhost:8081 npm run start -w @app/backend
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 npm run web -w @app/mobile -- --port 8081
```

For an iOS simulator, use `npm run ios -w @app/mobile`. It starts Expo on `http://127.0.0.1:8082` for the simulator and can run alongside Expo web on port 8081. For an Android emulator, use `npm run android -w @app/mobile`. The default API address is `http://localhost:3000` on iOS and Expo web, and `http://10.0.2.2:3000` on Android. On a physical device, set `EXPO_PUBLIC_API_URL` to the computer's reachable LAN address before starting Expo. `EXPO_WEB_ORIGIN` grants CORS only to the specified Expo web origin; native requests do not need it.

`npm run test:mobile:browser` starts the backend and Expo web server, runs Playwright checks, and executes the canonical application Cucumber inventory against the Expo web app. This verifies the shared UI and API path in a browser. Native device interaction still needs a simulator or physical-device check.

## AWS delivery

`compose.yaml` is the local dependency source. `docker compose config --format json` is validated by `infra/runtime/compose.ts` and compiled into one bounded ECS/Fargate task for each PR preview. The compiler rejects unsupported Compose semantics. `FullstackTsPreviewFoundation` is the permanent CDK foundation; ordinary previews use `infra/runtime/preview-cli.ts` and expire four hours after first successful HTTPS health. `FullstackTs-dev` and `FullstackTs-prod` are separate CDK application stacks with Lambda, API Gateway, DynamoDB, private S3, and CloudFront. Main-branch delivery promotes the same image digest and frontend archive after dev verification.

The checked-in Actions and CDK require owner enrollment before any live deployment. Use `.claude/skills/fullstack-aws-delivery/SKILL.md` for the ordered AWS, GitHub, and Cloudflare setup and live proof. Hosts follow `pr-<number>.preview.<project>.joedodge.dev`, `dev.<project>.joedodge.dev`, and `prod.<project>.joedodge.dev`, where `<project>` is `applicationName`. Do not commit account IDs, hosted-zone IDs, certificates, or credentials.
