import { CfnOutput, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { CfnSecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { CfnCluster } from 'aws-cdk-lib/aws-ecs';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

import { type FoundationConfig, parseFoundationConfig } from './config.js';

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

    const previewZone = HostedZone.fromHostedZoneAttributes(this, 'PreviewZone', {
      hostedZoneId: config.previewZoneId,
      zoneName: config.previewZoneName,
    });

    const outputs: Readonly<Record<string, string>> = {
      BackendRepositoryUri: backendRepository.repositoryUri,
      ClusterArn: cluster.attrArn,
      FrontendRepositoryUri: frontendRepository.repositoryUri,
      LogGroupName: logGroup.logGroupName,
      PreviewZoneId: previewZone.hostedZoneId,
      PreviewZoneName: previewZone.zoneName,
      StateTableName: stateTable.tableName,
      TaskSecurityGroupId: taskSecurityGroup.attrGroupId,
      VpcId: vpc.vpcId,
    };
    for (const [outputId, value] of Object.entries(outputs)) {
      new CfnOutput(this, outputId, { value });
    }
    new CfnOutput(this, 'PublicSubnetIds', {
      value: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
    });
  }

  private imageRepository(
    id: string,
    config: FoundationConfig,
    role: 'backend' | 'frontend',
  ): Repository {
    return new Repository(this, id, {
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `${config.applicationName}-${role}`,
    });
  }
}
