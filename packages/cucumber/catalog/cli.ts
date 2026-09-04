import path from 'node:path';

import { loadBehaviorCatalog } from './catalog.js';

const featureRoot = path.resolve('packages/cucumber/features');
const catalog = await loadBehaviorCatalog(featureRoot);
const applicationCases = catalog.cases.filter(
  (catalogCase) => catalogCase.category === 'application',
);
const factoryCases = catalog.cases.filter((catalogCase) => catalogCase.category === 'factory');

process.stdout.write(
  `Validated ${String(catalog.cases.length)} canonical cases (${String(applicationCases.length)} application, ${String(factoryCases.length)} factory).\n`,
);
