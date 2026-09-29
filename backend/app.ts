import express, { type Express } from 'express';
import helmet from 'helmet';

import type { Connections } from './config/connections.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/errors.js';
import { allowExpoWebOrigin } from './middleware/expo-web-origin.js';
import { createApiRouter } from './routes/index.js';
import { createHealthService } from './services/health.js';

export interface AppDependencies {
  readonly connections: Connections;
  readonly expoWebOrigin?: string;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const healthService = createHealthService(dependencies.connections.health);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(allowExpoWebOrigin(dependencies.expoWebOrigin));
  app.use(express.json());
  app.use('/api', createApiRouter(healthService));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
