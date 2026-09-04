import { Router } from 'express';

import { createV1Router } from './v1/index.js';
import type { HealthService } from '../services/health.js';

export function createApiRouter(service: HealthService): Router {
  const router = Router();
  router.use('/v1', createV1Router(service));
  return router;
}
