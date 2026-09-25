import { Router } from 'express';

import { createHealthRoute } from './health.js';
import type { HealthService } from '../../services/health.js';

export function createV1Router(healthService: HealthService): Router {
  const router = Router();
  router.use(createHealthRoute(healthService));
  return router;
}
