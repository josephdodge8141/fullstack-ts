import assert from 'node:assert/strict';
import test from 'node:test';

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { PreviewFoundationStack } from './stack.js';

function foundationTemplate(): Template {
  const app = new App();
  const stack = new PreviewFoundationStack(app, 'TestFoundation', {
    config: { applicationName: 'example-app' },
  });
  return Template.fromStack(stack);
}

test('factory.foundation.synth creates only reusable permanent resources', () => {
  const template = foundationTemplate();

  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::EC2::NatGateway', 0);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
  template.resourceCountIs('AWS::ECR::Repository', 4);
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.resourceCountIs('AWS::Logs::LogGroup', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::Route53::HostedZone', 1);
  template.resourceCountIs('AWS::IAM::ManagedPolicy', 0);
  template.hasResourceProperties('AWS::ECR::Repository', {
    ImageTagMutability: 'IMMUTABLE',
    LifecyclePolicy: Match.objectLike({}),
  });
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [Match.objectLike({ AttributeName: 'previewKey', KeyType: 'HASH' })],
  });
});

test('factory.foundation.synth exposes task execution and bounded image capabilities', () => {
  const template = foundationTemplate().toJSON();
  const outputs = Object.keys(template.Outputs as Record<string, unknown>);
  assert.deepEqual(
    outputs.sort(),
    [
      'BackendRepositoryUri',
      'ClusterArn',
      'FrontendRepositoryUri',
      'RouterRepositoryUri',
      'LogGroupName',
      'PreviewZoneId',
      'PreviewZoneName',
      'PublicSubnetIds',
      'StateTableName',
      'TaskExecutionRoleArn',
      'TaskRoleArn',
      'TaskSecurityGroupId',
      'VpcId',
      'ReleaseBackendRepositoryUri',
      'ReleaseArtifactBucketName',
    ].sort(),
  );
  const serialized = JSON.stringify(template);
  assert.match(serialized, /preview\.example-app\.joedodge\.dev/);
  for (const requiredAction of ['ecr:BatchGetImage', 'logs:PutLogEvents']) {
    assert.match(serialized, new RegExp(requiredAction));
  }
  for (const forbiddenAction of [
    'cloudformation:',
    'ec2:DeleteVpc',
    'ecr:DeleteRepository',
    'ecs:DeleteCluster',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenAction));
  }
});

test('factory.foundation.synth excludes dynamic preview resources', () => {
  const resources = foundationTemplate().toJSON().Resources as Record<
    string,
    { readonly Type?: string }
  >;
  const types = new Set(Object.values(resources).map((resource) => resource.Type));

  for (const forbidden of [
    'AWS::ECS::Service',
    'AWS::ECS::TaskDefinition',
    'AWS::Route53::RecordSet',
    'AWS::Lambda::Function',
    'AWS::Scheduler::Schedule',
  ]) {
    assert.equal(types.has(forbidden), false, `${forbidden} must be created dynamically`);
  }
});
