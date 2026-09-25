import { CfnOutput, Duration, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { CfnSecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { CfnCluster } from 'aws-cdk-lib/aws-ecs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

import { type FoundationConfig, type FoundationOutputs, parseFoundationConfig } from './config.js';

export interface PreviewFoundationStackProps extends StackProps {
  readonly config: FoundationConfig;
}

export class PreviewFoundationStack extends Stack {
  public readonly previewZoneId: string;
  public readonly releaseArtifactBucketName: string;

  public constructor(scope: Construct, id: string, props: PreviewFoundationStackProps) {
    super(scope, id, props);
    const config = parseFoundationConfig(props.config);

    Tags.of(this).add('fullstack-ts:application', config.applicationName);
    Tags.of(this).add('fullstack-ts:scope', 'permanent-preview-foundation');

    const vpc = new Vpc(this, 'PreviewVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });
    const cluster = new CfnCluster(this, 'PreviewCluster', {
      clusterName: `${config.applicationName}-preview`,
    });

    const taskSecurityGroup = new CfnSecurityGroup(this, 'PreviewTaskSecurityGroup', {
      groupDescription: 'Ingress for dynamically managed Caddy preview tasks',
      groupName: `${config.applicationName}-preview-tasks`,
      securityGroupEgress: [{ cidrIp: '0.0.0.0/0', ipProtocol: '-1' }],
      securityGroupIngress: [
        {
          cidrIp: '0.0.0.0/0',
          description: 'Public HTTP to Caddy',
          fromPort: 80,
          ipProtocol: 'tcp',
          toPort: 80,
        },
        {
          cidrIp: '0.0.0.0/0',
          description: 'Public HTTPS to Caddy',
          fromPort: 443,
          ipProtocol: 'tcp',
          toPort: 443,
        },
      ],
      vpcId: vpc.vpcId,
    });

    const frontendRepository = this.imageRepository('FrontendImages', config, 'frontend');
    const backendRepository = this.imageRepository('BackendImages', config, 'backend');
    const routerRepository = this.imageRepository('RouterImages', config, 'router');
    const releaseRepository = new Repository(this, 'ReleaseBackendImages', {
      imageScanOnPush: true,
      imageTagMutability: TagMutability.IMMUTABLE,
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `${config.applicationName}-release-backend`,
    });
    const releaseBucket = new Bucket(this, 'ReleaseArtifacts', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const stateTable = new Table(this, 'PreviewState', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'previewKey', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
      tableName: `${config.applicationName}-preview-state`,
      timeToLiveAttribute: 'expiresAt',
    });

    const logGroup = new LogGroup(this, 'PreviewLogs', {
      logGroupName: `/fullstack-ts/${config.applicationName}/preview`,
      removalPolicy: RemovalPolicy.RETAIN,
      retention: RetentionDays.ONE_WEEK,
    });

    const taskExecutionRole = new Role(this, 'TaskExecutionRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Pulls preview images and writes container logs for Fargate',
      roleName: `${config.applicationName}-preview-task-execution`,
    });
    const taskRole = new Role(this, 'TaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Runtime identity for the disposable preview task',
      roleName: `${config.applicationName}-preview-task`,
    });
    taskExecutionRole.addToPolicy(
      new PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }),
    );
    taskExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:BatchGetImage',
          'ecr:GetDownloadUrlForLayer',
        ],
        resources: [
          frontendRepository.repositoryArn,
          backendRepository.repositoryArn,
          routerRepository.repositoryArn,
        ],
      }),
    );
    taskExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [`${logGroup.logGroupArn}:*`],
      }),
    );

    const previewZone = new HostedZone(this, 'PreviewZone', {
      zoneName: `preview.${config.applicationName}.joedodge.dev`,
    });
    this.previewZoneId = previewZone.hostedZoneId;
    this.releaseArtifactBucketName = releaseBucket.bucketName;

    const outputs: FoundationOutputs = {
      BackendRepositoryUri: backendRepository.repositoryUri,
      ClusterArn: cluster.attrArn,
      FrontendRepositoryUri: frontendRepository.repositoryUri,
      RouterRepositoryUri: routerRepository.repositoryUri,
      LogGroupName: logGroup.logGroupName,
      PreviewZoneId: previewZone.hostedZoneId,
      PreviewZoneName: previewZone.zoneName,
      PublicSubnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
      StateTableName: stateTable.tableName,
      TaskExecutionRoleArn: taskExecutionRole.roleArn,
      TaskRoleArn: taskRole.roleArn,
      TaskSecurityGroupId: taskSecurityGroup.attrGroupId,
      VpcId: vpc.vpcId,
      ReleaseBackendRepositoryUri: releaseRepository.repositoryUri,
      ReleaseArtifactBucketName: releaseBucket.bucketName,
    };
    for (const [outputId, value] of Object.entries(outputs)) {
      new CfnOutput(this, outputId, { value });
    }
  }

  private imageRepository(
    id: string,
    config: FoundationConfig,
    role: 'backend' | 'frontend' | 'router',
  ): Repository {
    return new Repository(this, id, {
      imageScanOnPush: true,
      imageTagMutability: TagMutability.IMMUTABLE,
      lifecycleRules: [
        {
          description: 'Expire preview images after fourteen days',
          maxImageAge: Duration.days(14),
        },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `${config.applicationName}-${role}`,
    });
  }
}
