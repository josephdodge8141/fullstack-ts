import assert from 'node:assert/strict';
import test from 'node:test';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { exampleApplicationConfig, frontendBucketName, parseApplicationConfig } from './config.js';
import { ApplicationStack } from './stack.js';

function template(stage: 'dev' | 'prod'): Template {
  const app = new App();
  return Template.fromStack(
    new ApplicationStack(app, `Application-${stage}`, {
      config: exampleApplicationConfig(stage),
    }),
  );
}

test('dedicated application stages synthesize Lambda API Gateway DynamoDB and private CloudFront S3', () => {
  for (const stage of ['dev', 'prod'] as const) {
    const stack = template(stage);
    stack.resourceCountIs('AWS::DynamoDB::Table', 1);
    stack.resourceCountIs('AWS::Lambda::Function', 1);
    stack.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    stack.resourceCountIs('AWS::CloudFront::Distribution', 1);
    stack.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    stack.resourceCountIs('AWS::S3::Bucket', 1);
    stack.resourceCountIs('AWS::S3::BucketPolicy', 1);
    stack.resourceCountIs('AWS::ECS::TaskDefinition', 0);
    stack.resourceCountIs('AWS::ECS::Service', 0);
    stack.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    stack.hasResourceProperties('AWS::Lambda::Function', { PackageType: 'Image' });
    assert.match(
      JSON.stringify(stack.toJSON()),
      new RegExp(`${stage}\\.example-app\\.joedodge\\.dev`),
    );
  }
});

test('production state is retained with point-in-time recovery', () => {
  const stack = template('prod');
  stack.hasResource('AWS::DynamoDB::Table', {
    DeletionPolicy: 'Retain',
    Properties: Match.objectLike({
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    }),
  });
  stack.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Retain' });
});

test('application deploy requires digest image and us-east-1 certificate', () => {
  for (const bad of [
    { backendImageUri: 'example:latest' },
    { certificateArn: 'arn:aws:acm:us-west-2:111111111111:certificate/id' },
    { stage: 'preview' },
  ]) {
    assert.throws(() => parseApplicationConfig({ ...exampleApplicationConfig('dev'), ...bad }));
  }
});

test('frontend bucket names remain bounded and distinguish long project slugs', () => {
  const account = '111111111111';
  const region = 'ap-southeast-2';
  const first = frontendBucketName(
    'long-project-slug-with-a-unique-suffix-one',
    'prod',
    account,
    region,
  );
  const second = frontendBucketName(
    'long-project-slug-with-a-unique-suffix-two',
    'prod',
    account,
    region,
  );
  assert.ok(first.length <= 63);
  assert.match(first, /^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  assert.notEqual(first, second);
});
