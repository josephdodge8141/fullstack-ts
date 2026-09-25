#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { exampleFoundationConfig, parseFoundationConfig } from './config.js';
import { parseApplicationConfig } from './application/config.js';
import { ApplicationStack } from './application/stack.js';
import { PreviewFoundationStack } from './stack.js';
import { DeliveryIdentityStack } from './identity-stack.js';

const app = new App();
const config = parseFoundationConfig({
  applicationName:
    app.node.tryGetContext('foundation:applicationName') ?? exampleFoundationConfig.applicationName,
});

const foundation = new PreviewFoundationStack(app, 'FullstackTsPreviewFoundation', { config });

const repository = app.node.tryGetContext('identity:repository');
if (repository !== undefined) {
  const existingProviderArn = app.node.tryGetContext('identity:existingProviderArn');
  new DeliveryIdentityStack(app, 'FullstackTsDeliveryIdentity', {
    config: {
      applicationName: config.applicationName,
      repository,
      previewZoneId: foundation.previewZoneId,
      releaseArtifactBucketName: foundation.releaseArtifactBucketName,
      ...(existingProviderArn === undefined ? {} : { existingProviderArn }),
    },
  });
}

const stage = app.node.tryGetContext('application:stage');
if (stage !== undefined) {
  const applicationConfig = parseApplicationConfig({
    applicationName: config.applicationName,
    stage,
    backendImageUri: app.node.tryGetContext('application:backendImageUri'),
    certificateArn: app.node.tryGetContext('application:certificateArn'),
  });
  new ApplicationStack(app, `FullstackTs-${applicationConfig.stage}`, {
    config: applicationConfig,
  });
}
