# Application release

`application-deploy.yml` builds the Lambda Web Adapter backend image and frontend archive once on main. It stores an exact-SHA manifest and frontend archive in the retained release bucket and pins the backend ECR digest. The dev job deploys `FullstackTs-dev`, uploads the frontend, invalidates CloudFront, verifies health, HTML, manifest and Lambda digest, then records a dev verification receipt. The prod job reads and hashes the same artifacts, verifies the receipt and current main head, creates and waits for a DynamoDB backup if the production table already exists, deploys `FullstackTs-prod`, and verifies HTTPS and exact artifacts.

Each application stack gets its own DynamoDB table, Lambda function, HTTP API, private S3 frontend bucket, and CloudFront distribution. The starter has no CRUD flow or auth/email provider. The table is provisioned for future application code. Additional peripherals belong to the generated project's Compose/CDK/feature scope and must not be guessed from this template.

Run `npm run test:infra` and synthesize each stage with valid digest and `us-east-1` certificate context before changing delivery. Do not turn a successful synthesis into a deployment claim. Production table PITR and retention are CDK properties; the available backup check is a separate workflow prerequisite for updates.
