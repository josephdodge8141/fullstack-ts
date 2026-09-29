import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDefaultConfig } from 'expo/metro-config.js';

const mobileRoot = path.dirname(fileURLToPath(import.meta.url));
const config = getDefaultConfig(mobileRoot);
const frontendRoot = path.resolve(mobileRoot, '../frontend') + path.sep;
const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('#prehydration/') &&
    context.originModulePath.includes(`${path.sep}@base-ui${path.sep}react${path.sep}`)
  ) {
    const packageRoot = context.originModulePath.split(
      `${path.sep}@base-ui${path.sep}react${path.sep}`,
    )[0];
    return context.resolveRequest(
      context,
      path.join(packageRoot, '@base-ui/react/internals/prehydrationScript.stub.mjs'),
      platform,
    );
  }
  if (
    context.originModulePath.startsWith(frontendRoot) &&
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js')
  ) {
    return context.resolveRequest(context, moduleName.slice(0, -3), platform);
  }
  if (defaultResolve) return defaultResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

export default config;
