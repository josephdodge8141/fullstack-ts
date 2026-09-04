---
name: initialize-fullstack-ts
description: Initialize a repository created from fullstack-ts, verify credential-free Docker Compose startup, and guide its owner through application identity, GitHub checks, AWS preview deployment, and Bedrock browser-agent setup.
---

# Initialize fullstack-ts

Use this skill in an existing repository generated from fullstack-ts. Discover its actual files, scripts, and recorded choices before acting. Repository owners control the starter and may change its conventions; do not retrofit newer factory rules into an older generated repository.

## Establish the current state

Read root CLAUDE.md or AGENTS.md, README.md, package.json, docker-compose.yaml, the shared Cucumber features, and existing initialization notes. Follow the paired folder instructions for areas changed. Reuse answers from the current conversation and repository configuration; ask only for decisions or access still missing.

Determine whether the user wants local onboarding, application identity configuration, cloud preview enrollment, or the whole initialization. A local-only request does not authorize DNS, IAM, repository-setting, or deployment changes. Existing authorization for the selected setup remains valid; do not ask for repetitive confirmation.

For the factory's own acceptance run, first finish the complete template wiring with generic fixture/example values, then generate the separate Hello World reference repository and populate its actual configuration there. Do not turn this sequence into a local-only template or report stubbed cloud/model results as a successful full deployment. A generated consumer should use shipped commands without undocumented manual repairs.

Identify actual npm scripts and deployment commands from the repository. Do not invent script names or claim capabilities that this generated version does not contain. If expected factory wiring is missing, report that concrete gap and prepare the smallest necessary change within the user's request.

## Verify the local baseline first

The unmodified starter must boot with `docker compose up` after cloning and serve Hello World plus a backend health route. AWS credentials, model credentials, an external identity-provider account, a manually copied environment file, and a separate port-finder service must not be required for this default mode. A bundled self-hosted IdP may use synthetic local fixture configuration. Downloading public images/packages may require internet.

Check Docker/Compose availability and the repository's supported versions. Validate Compose without printing expanded secrets. Launch the default Compose services, discover their published local URL and health route from the actual configuration, and verify both. Keep existing user data and unrelated containers intact.

Run the repository's existing Cucumber inventory/parity, backend acceptance and frontend Cucumber/Playwright commands to verify full local onboarding. CI also runs Playwright; the independent deployed browser agent is a separate check. If initialization changes application behavior, start with the relevant Cucumber behavior and execute failing steps before implementation. Test-first chronology and the exact three-caller reuse rule are instructions, not CI attestations or caller-count lint rules.

Frontend signup/login/logout acceptance uses real bundled Keycloak/auth PostgreSQL and the real backend. A mocked backend provider connection cannot stand in for the provider's hosted UI. Run the factory behavior adapter when onboarding changes meaningful factory behavior; BE/FE applicability remains explicit in the shared catalog.

Do not add a business CRUD sample, seed system, cloud dependency, or external login requirement merely to initialize the generic starter.

## Record the choices that affect configuration

Use a concise initialization record with values or references for the selected items:

| Area                | Required decisions                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository          | Owner/name, default branch, visibility, whether remote enrollment is requested; public is the starter default                                                                  |
| Application         | Display name, local port choices only if defaults conflict, optional database/provider dependencies                                                                            |
| User authentication | Bundled Keycloak realm/client setup, exact callback/logout URLs, session configuration and private synthetic test-identity references; v1 covers login, logout and signup only |
| Preview platform    | AWS account and region, preview zone name and hosted-zone ID, delegation owner, existing or new shared platform resources                                                      |
| GitHub to AWS       | OIDC trust, actual token subject format for this repository, deployment role and browser-inference role, required workflow variables and secrets                               |
| Browser agent       | Bedrock endpoint/region, supported OpenAI model or inference-profile ID, model access and provider settings                                                                    |

Application OIDC login and GitHub OIDC federation into AWS are separate trust relationships. Configuring one does not configure the other.

Keep Hello World and the generic health endpoint public. This version uses Keycloak plus its auth PostgreSQL sidecar and exposes strictly login, logout and signup. Do not add password recovery, MFA, social login, profile editing or user-administration product screens. Follow the recorded signup audience/email-verification policy rather than inferring it from the word signup. Provider administration is internal setup. For a different generated version or explicit owner changes, follow that repository's actual accepted scope rather than retrofitting this one.

Render the exact realm issuer, client callback and logout-return URLs from the local or preview origin, preserving issuer verification when backend traffic uses an internal connection address. Public previews must replace local dummy credentials with private synthetic test-identity configuration. Verify signup using a run-unique identity, login, a minimal authenticated operation and logout in the generated reference. Logout must invalidate the app session and end the current Keycloak browser session; report provider failure accurately and do not promise other-device/global logout. If the recorded policy uses unverified email without SMTP, never treat that email as verified or use it as the authorization identity.

Keep public examples generic. Store secrets using the repository's supported ignored local files or the requested secret store. Non-secret deployment values may still be personal; use GitHub variables/private configuration as appropriate. Never include secret values in initialization notes, command output, model prompts, public examples, or committed files.

## Configure dependencies through Compose

For previews, Compose is the user-maintained source of truth. Use the repository's Compose normalization/validation path and its documented extension fields. Do not introduce a parallel hand-maintained service manifest or silently duplicate dependency configuration in CDK.

Confirm that chosen images, ports, environment references, health checks, mounts, and startup dependencies fit the preview translator's supported subset. Explain unsupported fields with their exact service/field path. Do not silently ignore local networking, bind mounts, privileged options, or other settings whose omission changes application behavior.

Use actual dependency containers in previews; backend acceptance replaces only outbound database/provider connections. Application seed, backup, reset, and durability policies are outside initialization unless the owner specifically requests them.

## Enroll cloud previews when requested

Inspect the selected AWS identity without exposing credentials. Verify the selected region, hosted zone, actual public delegation, and ownership of any shared resources before changing them. For a child zone hosted in Route 53 under an externally hosted parent, install only the necessary child NS delegation at the authoritative parent; do not move the apex nameservers.

Use the repository's CDK setup to provision or import its permanent preview foundations and enroll this repository. Ordinary PR updates use the shipped TypeScript dynamic deployment scripts, not CDK or disposable CloudFormation stacks. Keep the deployment request constrained to the selected account, region, zone, repository, and preview resource namespace. Required metadata and roles must remain compatible with this generated starter version. Do not deploy a copied CDK definition over an existing shared foundation without checking its ownership and compatibility contract.

Configure GitHub OIDC federation with temporary AWS credentials. Verify the current subject/claim format and IAM conditions from the repository's actual GitHub setup instead of assuming that repository-name-only subjects apply. Keep browser inference privileges separate from stack deployment privileges where the shipped workflow supports that split.

Prepare the exact configuration and resource changes before any additional approval that is actually needed. Execute already-authorized setup without repeatedly requesting permission. Do not create production resources, change unrelated repositories, or modify an unrelated domain.

## Configure and verify browser inference

Use the repository's model-provider interface, initially OpenAI models through Bedrock. Verify the selected endpoint, regional model/profile availability, necessary model capabilities, and role permissions. A model appearing in a catalog does not prove invocation access. Perform a bounded connection/capability check when the requested setup includes model execution, and report access failures accurately.

The agent controls a real browser using the CI runner's browser tools. Its behavioral instructions come from the canonical feature files, not application source, existing step definitions, or local Playwright scripts. It may inspect browser observations and diagnostics; do not add shell, database or out-of-browser API access as a shortcut. Playwright supports local iteration and a required CI acceptance suite; it is not the deployed browser agent.

Require an outcome for every expected scenario/example identity. True lack of browser observability may be an explicit no-op only when the canonical feature declares eligibility and its reason. Unexpected non-observability fails for feature correction; the agent cannot grant itself a new exemption. Inability to log in, failed navigation, uncertainty, provider errors, missing evidence/results, or timeouts must not become no-ops; they fail verification. The owner controls provider spending limits; the factory does not impose a separate dollar cap.

## Finish GitHub enrollment and prove the path

Use actual workflow names from this repository to configure required checks. Public is the default visibility, and public GitHub repositories support protected-branch checks. A private choice may have different account entitlements; check before promising enforcement.

Once cloud setup is proven, install the required browser-verification gate. Missing credentials or skipped jobs do not count as a browser pass after enrollment. Before enrollment, credential-free code checks remain usable; describe local readiness separately and state which cloud checks remain unavailable. Preserve an existing enrollment rather than treating missing credentials as a reason to remove its required check. Use the actual shipped status names and attach results to the tested PR revision, not a downstream workflow's default-branch SHA.

Deploy the existing generic application through the shipped workflow. PR creation/update replaces its previous preview. The single health route marks deployment success and starts a four-hour lifetime. A successful redeployment renews that lifetime; automatic ECS task replacement does not. PR close/merge triggers cleanup. Failed startup/action timeout must also clean up; rely on the shipped cloud recovery mechanism when a runner is lost. Do not add a deployed-commit endpoint or stronger readiness gate during initialization.

Verify that the follow-up browser workflow returns complete results and that the required check is attached to the originating workflow/PR. Confirm that cleanup is registered and show the expiry time; test teardown within the requested setup scope. Do not delete a preview the owner asked to keep running for review.

A completed passing browser result remains valid for the same PR revision after normal preview expiry. Expiry during an unfinished verification fails that attempt. A requested rerun starts a visible new attempt; do not automatically replay failures or uncertainties until one passes. Outside-fork contributions receive credential-free checks until a maintainer admits an exact revision through the shipped trusted path.

Report the local URL, configured preview URL if deployed, checks actually run, unresolved setup items, and locations of non-secret configuration. Distinguish completed setup from instructions the user still must perform. Preserve repeatability: rerunning this skill should inspect and reuse the existing setup instead of creating duplicate zones, roles, or repository configuration.
