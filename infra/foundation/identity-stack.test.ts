import assert from 'node:assert/strict';
import test from 'node:test';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DeliveryIdentityStack } from './identity-stack.js';

function template(): Record<string, unknown> {
  const app = new App();
  return Template.fromStack(
    new DeliveryIdentityStack(app, 'Identity', {
      config: {
        applicationName: 'example-app',
        repository: 'owner/repo',
        previewZoneId: 'Z12345',
        releaseArtifactBucketName: 'release-bucket',
      },
    }),
  ).toJSON() as Record<string, unknown>;
}

test('factory.foundation.oidc-trust limits trust to exact repository environment subjects', () => {
  const output = JSON.stringify(template());
  for (const environment of ['preview', 'dev', 'prod']) {
    assert.match(output, new RegExp(`repo:owner/repo:environment:${environment}`));
  }
  assert.match(output, /sts.amazonaws.com/);
  assert.doesNotMatch(output, /repo:owner\/\*/);
  assert.match(output, /hostedzone\/Z12345/);
  assert.match(output, /example-app-preview-state/);
});
