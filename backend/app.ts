import express, { type Express } from 'express';
import helmet from 'helmet';

import { errorMiddleware, notFoundMiddleware } from './middleware/errors.js';
import { createApiRouter } from './routes/index.js';
import { createHealthService, type HealthService } from './services/health.js';

export interface AppDependencies {
  readonly healthService?: HealthService;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const healthService = dependencies.healthService ?? createHealthService();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use('/api', createApiRouter(healthService));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
