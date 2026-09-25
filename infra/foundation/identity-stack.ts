import { CfnOutput, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import {
  FederatedPrincipal,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  type IOpenIdConnectProvider,
} from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import { z } from 'zod';

const identityConfigSchema = z
  .object({
    applicationName: z
      .string()
      .min(1)
      .max(40)
      .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
    repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    previewZoneId: z.string().min(1),
    releaseArtifactBucketName: z.string().min(3),
    existingProviderArn: z.string().startsWith('arn:aws:iam::').optional(),
  })
  .strict();

type IdentityConfig = z.infer<typeof identityConfigSchema>;

export interface DeliveryIdentityStackProps extends StackProps {
  readonly config: IdentityConfig;
}

export class DeliveryIdentityStack extends Stack {
  public constructor(scope: Construct, id: string, props: DeliveryIdentityStackProps) {
    super(scope, id, props);
    const config = identityConfigSchema.parse(props.config);
    Tags.of(this).add('fullstack-ts:application', config.applicationName);
    Tags.of(this).add('fullstack-ts:scope', 'delivery-identity');
    const provider: IOpenIdConnectProvider =
      config.existingProviderArn === undefined
        ? new OpenIdConnectProvider(this, 'GithubProvider', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
          })
        : OpenIdConnectProvider.fromOpenIdConnectProviderArn(
            this,
            'GithubProvider',
            config.existingProviderArn,
          );
    const assume = (environment: 'preview' | 'dev' | 'prod' | 'foundation') =>
      new FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': `repo:${config.repository}:environment:${environment}`,
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      );
    const preview = new Role(this, 'PreviewDeployRole', {
      assumedBy: assume('preview'),
      roleName: `${config.applicationName}-preview-deploy`,
    });
    const previewRepositoryArns = (['backend', 'frontend', 'router'] as const).map(
      (part) =>
        `arn:${this.partition}:ecr:${this.region}:${this.account}:repository/${config.applicationName}-${part}`,
    );
    preview.addToPolicy(
      new PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:CompleteLayerUpload',
          'ecr:DescribeImages',
          'ecr:InitiateLayerUpload',
          'ecr:PutImage',
          'ecr:UploadLayerPart',
        ],
        resources: previewRepositoryArns,
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Scan'],
        resources: [
          `arn:${this.partition}:dynamodb:${this.region}:${this.account}:table/${config.applicationName}-preview-state`,
        ],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['route53:ChangeResourceRecordSets'],
        resources: [`arn:${this.partition}:route53:::hostedzone/${config.previewZoneId}`],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: [
          'ecs:RegisterTaskDefinition',
          'ecs:DescribeTaskDefinition',
          'ecs:ListTaskDefinitions',
          'ecs:ListTasks',
        ],
        resources: ['*'],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/preview-pr-*`,
        ],
        conditions: {
          ArnEquals: {
            'ecs:cluster': `arn:${this.partition}:ecs:${this.region}:${this.account}:cluster/${config.applicationName}-preview`,
          },
        },
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['ecs:DeregisterTaskDefinition'],
        resources: [
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/preview-pr-*`,
        ],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['ecs:TagResource'],
        resources: [
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task/${config.applicationName}-preview/*`,
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/preview-pr-*`,
        ],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['ecs:DescribeTasks', 'ecs:StopTask'],
        resources: [
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task/${config.applicationName}-preview/*`,
        ],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['ecs:ListTagsForResource'],
        resources: [
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task/${config.applicationName}-preview/*`,
          `arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/preview-pr-*`,
        ],
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/${config.applicationName}-preview-task`,
          `arn:${this.partition}:iam::${this.account}:role/${config.applicationName}-preview-task-execution`,
        ],
        conditions: { StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' } },
      }),
    );
    preview.addToPolicy(
      new PolicyStatement({ actions: ['ec2:DescribeNetworkInterfaces'], resources: ['*'] }),
    );
    preview.addToPolicy(
      new PolicyStatement({
        actions: ['cloudformation:DescribeStacks'],
        resources: [
          `arn:${this.partition}:cloudformation:${this.region}:${this.account}:stack/FullstackTsPreviewFoundation/*`,
        ],
      }),
    );
    new CfnOutput(this, 'PreviewDeployRoleArn', { value: preview.roleArn });

    const foundation = new Role(this, 'FoundationDeployRole', {
      assumedBy: assume('foundation'),
      roleName: `${config.applicationName}-foundation-deploy`,
    });
    foundation.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-deploy-role-${this.account}-${this.region}`,
          `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-${this.account}-${this.region}`,
        ],
      }),
    );
    new CfnOutput(this, 'FoundationDeployRoleArn', { value: foundation.roleArn });

    for (const stage of ['dev', 'prod'] as const) {
      const role = new Role(this, `${stage}DeployRole`, {
        assumedBy: assume(stage),
        roleName: `${config.applicationName}-${stage}-deploy`,
      });
      role.addToPolicy(
        new PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }),
      );
      role.addToPolicy(
        new PolicyStatement({
          actions: [
            'ecr:BatchCheckLayerAvailability',
            'ecr:BatchGetImage',
            'ecr:CompleteLayerUpload',
            'ecr:DescribeImages',
            'ecr:InitiateLayerUpload',
            'ecr:PutImage',
            'ecr:UploadLayerPart',
          ],
          resources: [
            `arn:${this.partition}:ecr:${this.region}:${this.account}:repository/${config.applicationName}-release-backend`,
          ],
        }),
      );
      const buckets = [
        config.releaseArtifactBucketName,
        `${config.applicationName}-${stage}-frontend-${this.account}-${this.region}`,
      ];
      role.addToPolicy(
        new PolicyStatement({
          actions: ['s3:ListBucket'],
          resources: buckets.map((bucket) => `arn:${this.partition}:s3:::${bucket}`),
        }),
      );
      role.addToPolicy(
        new PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          resources: buckets.map((bucket) => `arn:${this.partition}:s3:::${bucket}/*`),
        }),
      );
      role.addToPolicy(
        new PolicyStatement({
          actions: ['cloudformation:DescribeStacks'],
          resources: [
            `arn:${this.partition}:cloudformation:${this.region}:${this.account}:stack/FullstackTsPreviewFoundation/*`,
            `arn:${this.partition}:cloudformation:${this.region}:${this.account}:stack/FullstackTs-${stage}/*`,
          ],
        }),
      );
      role.addToPolicy(
        new PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [
            `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-deploy-role-${this.account}-${this.region}`,
            `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-${this.account}-${this.region}`,
          ],
        }),
      );
      role.addToPolicy(
        new PolicyStatement({
          actions: ['lambda:GetFunction'],
          resources: [
            `arn:${this.partition}:lambda:${this.region}:${this.account}:function:${config.applicationName}-${stage}`,
          ],
        }),
      );
      role.addToPolicy(
        new PolicyStatement({
          actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
          resources: [`arn:${this.partition}:cloudfront::${this.account}:distribution/*`],
        }),
      );
      if (stage === 'prod') {
        role.addToPolicy(
          new PolicyStatement({
            actions: ['dynamodb:DescribeTable', 'dynamodb:CreateBackup'],
            resources: [
              `arn:${this.partition}:dynamodb:${this.region}:${this.account}:table/${config.applicationName}-prod`,
            ],
          }),
        );
        role.addToPolicy(
          new PolicyStatement({
            actions: ['dynamodb:DescribeBackup'],
            resources: [
              `arn:${this.partition}:dynamodb:${this.region}:${this.account}:table/${config.applicationName}-prod/backup/*`,
            ],
          }),
        );
      }
      new CfnOutput(this, `${stage}DeployRoleArn`, { value: role.roleArn });
    }
  }
}
