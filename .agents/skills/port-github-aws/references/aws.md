# AWS account promotion details

## Inventory by ownership

Start with CloudFormation/CDK stacks and the repository's declared configuration. Confirm both principals using `aws sts get-caller-identity --profile PROFILE`. Inventory stack parameters, outputs, tags, resources, termination protection, drift, retained resources, and external references. Use resource tags to discover related objects, but do not assume every AWS resource supports the Resource Groups Tagging API.

The shipped `FullstackTsPreviewFoundation` defines the preview VPC, ECS cluster, security group, three preview ECR repositories, a retained release ECR repository and S3 bucket, lifecycle table, logs, task roles, and a new Route 53 preview child zone. `FullstackTsDeliveryIdentity` defines environment-scoped GitHub OIDC roles. Dedicated `FullstackTs-dev` and `FullstackTs-prod` stacks define Lambda/API Gateway, DynamoDB, S3, and CloudFront. Ordinary preview tasks, definitions, and A records remain dynamic and outside CDK.

## Target configuration

Choose target values independently:

- application name and CloudFormation stack name;
- AWS account and region;
- ownership and delegation of the newly created preview child zone;
- tags, budgets and company ownership metadata;
- CDK bootstrap qualifier or company bootstrap convention;
- GitHub OIDC provider and narrowly scoped roles when an implementation actually exists.

Do not reuse source account IDs, hosted-zone IDs, ARNs, VPC/subnet IDs, security groups, KMS keys, certificates, secret ARNs or OIDC conditions as target values. Cross-account access is not a shortcut for target ownership unless the human explicitly designs and approves that architecture.

## Diff and deploy

For this repository, first run the credential-free synthesis command with explicit context:

```sh
npm run synth:foundation -- \
  -c foundation:applicationName=company-app
```

Then use the selected target profile and region for CDK bootstrap inspection, diff and deploy. `npm run synth:foundation` alone proves no live authorization or deployment. If the target requires CDK bootstrap, show its account-level effect and pause before creating or updating it.

Reject a diff that unexpectedly deletes or replaces a target resource, broadens IAM beyond the repository boundary, or references a source-account ARN. Treat target production stack creation as a separate approved migration step. Keep the synthesized template as review evidence without committing account-specific values.

After deployment, use CloudFormation APIs to verify status and outputs, and service-specific read APIs to verify properties that stack completion does not prove. Run drift detection only when its time and permissions are acceptable, and wait for a terminal result before interpreting it.

## Data, images and DNS

Infrastructure recreation does not migrate data. Decide separately for each stateful object:

- ECR: prefer rebuilding from the verified company commit; otherwise copy only approved digests and verify them.
- DynamoDB: use an explicit export/import, backup/restore or application migration plan with counts or invariants and rollback.
- CloudWatch Logs: normally retain source history rather than copy it.
- Secrets and parameters: rotate or re-enter values through company-approved stores; never emit values during inventory.
- Route 53: the foundation creates a child zone. Delegate it at the authoritative parent after verifying its target nameservers, then stage records and rollback TTLs.
- Certificates and identity-provider callbacks: issue/configure them for company domains and verify before traffic cutover.

Keep the personal stack until the target application and any approved data migration pass. Cleanup should be a later, exact-resource action that accounts for CDK retain policies.
