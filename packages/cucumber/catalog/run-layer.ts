import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api';
import type { Envelope } from '@cucumber/messages';

import { loadBehaviorCatalog } from './catalog.js';
import { normalizeLayerResults } from './layer-results.js';

const layer = process.argv[2];
const supportPath = process.argv[3];
if (layer !== 'backend' && layer !== 'frontend') {
  throw new Error('Usage: run-layer <backend|frontend> <support-file>');
}
if (supportPath === undefined) throw new Error('A support file is required.');

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const featureRoot = path.join(repositoryRoot, 'packages/cucumber/features');
const tagExpression = layer === 'backend' ? 'not @backend-noop' : 'not @frontend-noop';
const { runConfiguration } = await loadConfiguration(
  {
    file: false,
    provided: {
      format: [],
      import: [path.resolve(supportPath)],
      paths: [path.join(featureRoot, 'application')],
      publish: false,
      strict: true,
      tags: tagExpression,
    },
  },
  { cwd: repositoryRoot },
);
const envelopes: Envelope[] = [];
const result = await runCucumber(runConfiguration, { cwd: repositoryRoot }, (envelope) => {
  envelopes.push(envelope);
});
if (!result.success) throw new Error(`${layer} Cucumber execution failed.`);

const catalog = await loadBehaviorCatalog(featureRoot);
const normalized = normalizeLayerResults(catalog, layer, envelopes);
process.stdout.write(
  `${layer} represented ${String(normalized.counts.expected)} cases: ${String(normalized.counts.exercised)} passed, ${String(normalized.counts.noop)} justified no-op.\n`,
);
