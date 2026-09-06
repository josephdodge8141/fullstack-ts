import {
  ArnFormat,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  Tags,
  type StackProps,
} from 'aws-cdk-lib';
import { CfnSecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { CfnCluster } from 'aws-cdk-lib/aws-ecs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

import { type FoundationConfig, type FoundationOutputs, parseFoundationConfig } from './config.js';

export interface PreviewFoundationStackProps extends StackProps {
  readonly config: FoundationConfig;
}

export class PreviewFoundationStack extends Stack {
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

    const stateTable = new Table(this, 'PreviewState', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'previewKey', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
      tableName: `${config.applicationName}-preview-state`,
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
        resources: [frontendRepository.repositoryArn, backendRepository.repositoryArn],
      }),
    );
    taskExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [`${logGroup.logGroupArn}:*`],
      }),
    );

    const previewTaskDefinitionArn = this.formatArn({
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      resource: 'task-definition',
      resourceName: `${config.applicationName}-preview-*`,
      service: 'ecs',
    });
    const previewTaskArn = this.formatArn({
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      resource: 'task',
      resourceName: `${config.applicationName}-preview/*`,
      service: 'ecs',
    });
    const previewZoneArn = this.formatArn({
      account: '',
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      region: '',
      resource: 'hostedzone',
      resourceName: config.previewZoneId,
      service: 'route53',
    });
    const adapterPolicy = new ManagedPolicy(this, 'PreviewAdapterPolicy', {
      description: 'Generation-scoped preview operations; attach during repository enrollment',
      managedPolicyName: `${config.applicationName}-preview-adapter`,
      statements: [
        new PolicyStatement({ actions: ['ecr:GetAuthorizationToken'], resources: ['*'] }),
        new PolicyStatement({
          actions: [
            'ecr:BatchCheckLayerAvailability',
            'ecr:BatchGetImage',
            'ecr:CompleteLayerUpload',
            'ecr:DescribeImages',
            'ecr:GetDownloadUrlForLayer',
            'ecr:InitiateLayerUpload',
            'ecr:PutImage',
            'ecr:UploadLayerPart',
          ],
          resources: [frontendRepository.repositoryArn, backendRepository.repositoryArn],
        }),
        new PolicyStatement({ actions: ['ecs:RegisterTaskDefinition'], resources: ['*'] }),
        new PolicyStatement({
          actions: ['ecs:RunTask'],
          conditions: { ArnEquals: { 'ecs:cluster': cluster.attrArn } },
          resources: [previewTaskDefinitionArn],
        }),
        new PolicyStatement({
          actions: [
            'ecs:DeregisterTaskDefinition',
            'ecs:DescribeTaskDefinition',
            'ecs:TagResource',
          ],
          resources: [previewTaskDefinitionArn],
        }),
        new PolicyStatement({
          actions: ['ecs:StopTask'],
          conditions: { ArnEquals: { 'ecs:cluster': cluster.attrArn } },
          resources: [previewTaskArn],
        }),
        new PolicyStatement({
          actions: ['ecs:DescribeTasks', 'ecs:ListTasks'],
          conditions: { ArnEquals: { 'ecs:cluster': cluster.attrArn } },
          resources: ['*'],
        }),
        new PolicyStatement({
          actions: [
            'dynamodb:DeleteItem',
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
          ],
          resources: [stateTable.tableArn],
        }),
        new PolicyStatement({
          actions: ['route53:ChangeResourceRecordSets', 'route53:ListResourceRecordSets'],
          resources: [previewZoneArn],
        }),
        new PolicyStatement({ actions: ['route53:GetChange'], resources: ['*'] }),
        new PolicyStatement({ actions: ['ec2:DescribeNetworkInterfaces'], resources: ['*'] }),
        new PolicyStatement({
          actions: ['iam:PassRole'],
          conditions: { StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' } },
          resources: [taskExecutionRole.roleArn],
        }),
      ],
    });

    const previewZone = HostedZone.fromHostedZoneAttributes(this, 'PreviewZone', {
      hostedZoneId: config.previewZoneId,
      zoneName: config.previewZoneName,
    });

    const outputs: FoundationOutputs = {
      BackendRepositoryUri: backendRepository.repositoryUri,
      ClusterArn: cluster.attrArn,
      FrontendRepositoryUri: frontendRepository.repositoryUri,
      LogGroupName: logGroup.logGroupName,
      PreviewAdapterPolicyArn: adapterPolicy.managedPolicyArn,
      PreviewZoneId: previewZone.hostedZoneId,
      PreviewZoneName: previewZone.zoneName,
      PublicSubnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
      StateTableName: stateTable.tableName,
      TaskExecutionRoleArn: taskExecutionRole.roleArn,
      TaskSecurityGroupId: taskSecurityGroup.attrGroupId,
      VpcId: vpc.vpcId,
    };
    for (const [outputId, value] of Object.entries(outputs)) {
      new CfnOutput(this, outputId, { value });
    }
  }

  private imageRepository(
    id: string,
    config: FoundationConfig,
    role: 'backend' | 'frontend',
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
