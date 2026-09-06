import { Router } from 'express';

import { createHealthRoute } from './health.js';
import { createAuthRoute } from './auth.js';
import type { Environment } from '../../config/environment.js';
import type { AuthService } from '../../services/auth.js';
import type { HealthService } from '../../services/health.js';

export function createV1Router(
  healthService: HealthService,
  authService: AuthService,
  environment: Environment,
): Router {
  const router = Router();
  router.use(createHealthRoute(healthService));
  router.use(createAuthRoute(authService, environment.publicOrigin));
  return router;
}
