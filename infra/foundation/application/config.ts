import { createHash } from 'node:crypto';
import { z } from 'zod';

const applicationName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const imageUri =
  /^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$/;

export const applicationConfigSchema = z
  .object({
    applicationName: z.string().min(1).max(40).regex(applicationName),
    stage: z.enum(['dev', 'prod']),
    backendImageUri: z.string().regex(imageUri),
    certificateArn: z.string().startsWith('arn:aws:acm:us-east-1:'),
  })
  .strict();

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

export function frontendBucketName(
  applicationName: string,
  stage: 'dev' | 'prod',
  account: string,
  region: string,
): string {
  const digest = createHash('sha256').update(applicationName).digest('hex').slice(0, 12);
  return `${applicationName.slice(0, 10)}-${stage}-fe-${digest}-${account}-${region}`;
}

export function parseApplicationConfig(value: unknown): ApplicationConfig {
  return applicationConfigSchema.parse(value);
}

export function exampleApplicationConfig(stage: 'dev' | 'prod'): ApplicationConfig {
  return {
    applicationName: 'example-app',
    stage,
    backendImageUri:
      '111111111111.dkr.ecr.us-east-1.amazonaws.com/example-backend@sha256:' + '0'.repeat(64),
    certificateArn:
      'arn:aws:acm:us-east-1:111111111111:certificate/00000000-0000-0000-0000-000000000000',
  };
}
