import { CfnOutput, Fn, RemovalPolicy, Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { CfnApi, CfnIntegration, CfnRoute, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnFunction, CfnPermission } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption, type IBucket } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

import { type ApplicationConfig, parseApplicationConfig } from './config.js';

export interface ApplicationStackProps extends StackProps {
  readonly config: ApplicationConfig;
}

export class ApplicationStack extends Stack {
  public constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);
    const config = parseApplicationConfig(props.config);
    const prefix = `${config.applicationName}-${config.stage}`;
    const domain = `${config.stage}.${config.applicationName}.joedodge.dev`;
    const retention = config.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
    Tags.of(this).add('fullstack-ts:application', config.applicationName);
    Tags.of(this).add('fullstack-ts:environment', config.stage);

    const table = new Table(this, 'ApplicationTable', {
      tableName: prefix,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: config.stage === 'prod' },
      removalPolicy: retention,
    });
    const frontendBucket = new Bucket(this, 'FrontendBucket', {
      bucketName: `${prefix}-frontend-${this.account}-${this.region}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      autoDeleteObjects: false,
      removalPolicy: retention,
    });
    const role = new Role(this, 'BackendRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: `Runtime role for ${prefix}`,
    });
    role.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/lambda/${prefix}:*`,
        ],
      }),
    );
    table.grantReadWriteData(role);
    const logs = new LogGroup(this, 'BackendLogs', {
      logGroupName: `/aws/lambda/${prefix}`,
      retention: config.stage === 'prod' ? RetentionDays.THREE_MONTHS : RetentionDays.TWO_WEEKS,
      removalPolicy: retention,
    });
    const backend = new CfnFunction(this, 'BackendFunction', {
      functionName: prefix,
      packageType: 'Image',
      code: { imageUri: config.backendImageUri },
      role: role.roleArn,
      memorySize: 1024,
      timeout: 30,
      environment: {
        variables: {
          APP_ENV: config.stage,
          DYNAMODB_TABLE: table.tableName,
          HOST: '0.0.0.0',
          PORT: '3000',
          AWS_LWA_PORT: '3000',
          AWS_LWA_READINESS_CHECK_PATH: '/api/v1/health',
        },
      },
    });
    backend.node.addDependency(logs);
    const api = new CfnApi(this, 'HttpApi', { name: `${prefix}-api`, protocolType: 'HTTP' });
    const integration = new CfnIntegration(this, 'LambdaIntegration', {
      apiId: api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: backend.attrArn,
      payloadFormatVersion: '2.0',
    });
    new CfnRoute(this, 'DefaultRoute', {
      apiId: api.ref,
      routeKey: '$default',
      target: `integrations/${integration.ref}`,
    });
    new CfnStage(this, 'DefaultStage', { apiId: api.ref, stageName: '$default', autoDeploy: true });
    new CfnPermission(this, 'ApiInvokePermission', {
      action: 'lambda:InvokeFunction',
      functionName: backend.ref,
      principal: 'apigateway.amazonaws.com',
      sourceArn: `arn:${this.partition}:execute-api:${this.region}:${this.account}:${api.ref}/*`,
    });
    const distribution = new Distribution(this, 'Distribution', {
      certificate: Certificate.fromCertificateArn(this, 'Certificate', config.certificateArn),
      domainNames: [domain],
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(frontendBucket as IBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        'api/*': {
          origin: new HttpOrigin(Fn.select(2, Fn.split('/', api.attrApiEndpoint))),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    });
    new CfnOutput(this, 'ApplicationTableName', { value: table.tableName });
    new CfnOutput(this, 'FrontendBucketName', { value: frontendBucket.bucketName });
    new CfnOutput(this, 'BackendFunctionName', { value: backend.ref });
    new CfnOutput(this, 'ApiEndpoint', { value: api.attrApiEndpoint });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'DistributionDomain', { value: distribution.distributionDomainName });
    new CfnOutput(this, 'PublicHostname', { value: domain });
  }
}
