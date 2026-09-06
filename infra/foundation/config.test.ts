import assert from 'node:assert/strict';
import test from 'node:test';

import { parseFoundationConfig } from './config.js';

const validConfig = {
  applicationName: 'example-app',
  previewZoneId: 'Z0123456789EXAMPLE',
  previewZoneName: 'preview.example.com',
};

test('factory.foundation.config rejects invalid permanent configuration', () => {
  for (const [field, value] of [
    ['applicationName', 'Not Valid'],
    ['previewZoneName', 'localhost'],
    ['previewZoneId', 'not a zone id'],
  ] as const) {
    assert.throws(
      () => parseFoundationConfig({ ...validConfig, [field]: value }),
      new RegExp(field),
    );
  }
});
