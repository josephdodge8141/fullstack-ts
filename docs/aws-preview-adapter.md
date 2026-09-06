# AWS preview adapter boundary

Wave 4 provides a synthesis-only CDK foundation. It does not deploy the template or implement the dynamic AWS adapter. `npm run synth:foundation` must work without credentials because the stack is environment agnostic and performs no AWS lookups.

## Permanent CDK resources

The stack owns resources that remain across pull requests:

- one VPC with two public subnets and no NAT gateway;
- one ECS cluster and a security group that admits public HTTP and HTTPS to Caddy;
- separate frontend and backend ECR repositories;
- one on-demand DynamoDB table for lifecycle state and ownership;
- one shared CloudWatch log group; and
- a reference to an existing Route 53 preview child zone;
- one ECS task execution role restricted to pulling the two repositories and writing the shared log group.

The table, repositories and log group use retain policies. Repository tags are immutable and a lifecycle rule expires images after fourteen days, bounding storage while retaining short-lived debugging evidence. The supplied hosted-zone ID and name are references, so synthesis and deployment do not create, delegate or replace a DNS zone. The typed `FoundationOutputs` contract covers every emitted identifier the future adapter needs.

The template intentionally contains no ECS service, task definition, running task, Route 53 record, Lambda function or schedule. CDK is never part of an ordinary pull-request deployment or cleanup.

## Synthesis

The checked-in example configuration is generic and safe for credential-free validation:

```sh
npm run synth:foundation
```

A repository owner can synthesize a candidate template with explicit generic context values:

```sh
npm run synth:foundation -- \
  -c foundation:applicationName=my-app \
  -c foundation:previewZoneName=preview.example.com \
  -c foundation:previewZoneId=Z0123456789EXAMPLE
```

Configuration is validated before stack construction. The application name is lowercase kebab case, the zone name is a DNS name, and the zone ID has the Route 53 hosted-zone shape. Account IDs, real domains and credentials remain outside the repository.

## Future dynamic adapter

The adapter will consume the synthesized stack outputs and the effects from `infra/runtime/protocol.ts`. It must keep provider operations outside the reducer and follow this boundary:

1. Validate the trusted pull-request event, current candidate revision and normalized Compose contract before cloud mutation.
2. Load lifecycle state by immutable repository ID and pull-request number, call the reducer, and conditionally persist its next revision before executing effects.
3. For `ensure-preview`, build content-addressed frontend and backend images, reuse an existing matching digest or push a new immutable tag to the foundation repositories, register one generation-named task definition from the normalized Compose model, and start one public-IP Fargate task in the foundation cluster and subnets using the emitted task execution role.
4. Resolve the task network interface, then create the generation-owned DNS record only after proving the task and ownership tuple match the persisted generation.
5. Poll the public health route within the startup deadline and submit the first successful observation to the reducer. A timeout or uncertain result fails and enters the same cleanup path.
6. For `cleanup-preview`, verify the complete ownership tuple before removing the owned DNS record, stopping the owned task, confirming it stopped and deregistering its task definition.
7. Reconcile uncertain provider responses through the reducer's idempotent effects. Never convert uncertainty into success.

The future enrollment and runtime implementation must validate every provider request before making the call. That validation must include the task-family prefix, Fargate compatibility, a non-privileged task shape, bounded CPU and memory, the exact emitted public subnet IDs and security-group ID, the emitted task execution role, cluster, ECR repository, lifecycle table and hosted-zone scope, and the immutable repository/pull-request/generation ownership tuple. It must also prove ownership of each generation before task, state or DNS mutation. These are future adapter responsibilities, not permissions enforced by a shipped managed policy or a runtime import gate.

The future implementation also needs narrowly scoped GitHub OIDC enrollment. Its role must restrict the immutable repository identity and trusted workflow/ref conditions, separate foundation deployment from dynamic preview permissions, and enforce the same enrollment and runtime validation boundary before provider calls. Wave 4 creates no OIDC provider, caller role or runtime adapter.

No live AWS lifecycle, DNS delegation, GitHub enrollment or provider authorization has been proven in this wave.
