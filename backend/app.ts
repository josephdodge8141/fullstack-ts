import express, { type Express } from 'express';
import helmet from 'helmet';

import type { Connections } from './config/connections.js';
import { loadEnvironment, type Environment } from './config/environment.js';
import { createSessionMiddleware } from './middleware/session.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/errors.js';
import { createApiRouter } from './routes/index.js';
import { createHealthService } from './services/health.js';
import { createAuthService } from './services/auth.js';

export interface AppDependencies {
  readonly connections: Connections;
  readonly environment?: Environment;
}

export function createApp(dependencies: AppDependencies): Express {
  const environment = dependencies.environment ?? loadEnvironment();
  const app = express();
  const healthService = createHealthService(dependencies.connections.health);
  const authService = createAuthService(dependencies.connections.auth);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(createSessionMiddleware(environment.sessionSecret));
  app.use('/api', createApiRouter(healthService, authService, environment));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
