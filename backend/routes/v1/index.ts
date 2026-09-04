import { Router } from 'express';

import { createHealthRoute } from './health.js';
import type { HealthService } from '../../services/health.js';

export function createV1Router(service: HealthService): Router {
  const router = Router();
  router.use(createHealthRoute(service));
  return router;
}
