import { Router } from 'express';

import { createV1Router } from './v1/index.js';
import type { Environment } from '../config/environment.js';
import type { HealthService } from '../services/health.js';
import type { AuthService } from '../services/auth.js';

export function createApiRouter(
  healthService: HealthService,
  authService: AuthService,
  environment: Environment,
): Router {
  const router = Router();
  router.use('/v1', createV1Router(healthService, authService, environment));
  return router;
}
