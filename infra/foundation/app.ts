#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { exampleFoundationConfig, parseFoundationConfig } from './config.js';
import { PreviewFoundationStack } from './stack.js';

const app = new App();
const config = parseFoundationConfig({
  applicationName:
    app.node.tryGetContext('foundation:applicationName') ?? exampleFoundationConfig.applicationName,
  previewZoneId:
    app.node.tryGetContext('foundation:previewZoneId') ?? exampleFoundationConfig.previewZoneId,
  previewZoneName:
    app.node.tryGetContext('foundation:previewZoneName') ?? exampleFoundationConfig.previewZoneName,
});

new PreviewFoundationStack(app, 'FullstackTsPreviewFoundation', { config });
