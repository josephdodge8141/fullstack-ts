# Production delivery

`FullstackTs-prod` is a dedicated CDK stack with its own DynamoDB table, Lambda/API Gateway backend, private S3 frontend, and CloudFront distribution. The table and bucket are retained. Point-in-time recovery is enabled on the production table. `application-deploy.yml` requires an available DynamoDB backup before an existing production table update, and promotes the exact backend digest and frontend archive verified in development.

The starter has no business data flow, authentication, email, or event provider. Add peripherals only when a generated application's own code and CDK require them. See `.claude/skills/fullstack-aws-delivery/references/release.md` for the shipped release contract.
