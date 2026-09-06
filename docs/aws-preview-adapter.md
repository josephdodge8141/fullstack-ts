# AWS preview adapter boundary

Wave 4 provides a synthesis-only CDK foundation. It does not deploy the template or implement the dynamic AWS adapter. `npm run synth:foundation` must work without credentials because the stack is environment agnostic and performs no AWS lookups.

## Permanent CDK resources

The stack owns resources that remain across pull requests:

- one VPC with two public subnets and no NAT gateway;
- one ECS cluster and a security group that admits public HTTP and HTTPS to Caddy;
- separate frontend and backend ECR repositories;
- one on-demand DynamoDB table for lifecycle state and ownership;
- one shared CloudWatch log group; and
- a reference to an existing Route 53 preview child zone.

The table, repositories and log group use retain policies. The supplied hosted-zone ID and name are references, so synthesis and deployment do not create, delegate or replace a DNS zone. The stack outputs every identifier the future adapter needs.

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
3. For `ensure-preview`, build immutable frontend and backend images, push them to the foundation repositories, register one task definition from the normalized Compose model, and start one public-IP Fargate task in the foundation cluster and subnets.
4. Resolve the task network interface, then create the generation-owned DNS record only after proving the task and ownership tuple match the persisted generation.
5. Poll the public health route within the startup deadline and submit the first successful observation to the reducer. A timeout or uncertain result fails and enters the same cleanup path.
6. For `cleanup-preview`, verify the complete ownership tuple before removing the owned DNS record, stopping the owned task, confirming it stopped and deregistering its task definition.
7. Reconcile uncertain provider responses through the reducer's idempotent effects. Never convert uncertainty into success.

The adapter may create only generation-scoped task definitions, tasks and DNS records. It may write the lifecycle table and log group and push immutable images. It may not modify the VPC, cluster, repositories, hosted zone, security group or CDK stack.

The future implementation also needs narrowly scoped GitHub OIDC and AWS IAM enrollment. Those policies must restrict the immutable repository identity and trusted workflow/ref conditions, separate foundation deployment from dynamic preview permissions, and grant only the operations listed above. Wave 4 does not create or claim those roles.

No live AWS lifecycle, DNS delegation, GitHub enrollment or provider authorization has been proven in this wave.
