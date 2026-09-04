import { Router } from 'express';

import { createHealthController } from '../../controllers/health.js';
import type { HealthService } from '../../services/health.js';

export function createHealthRoute(service: HealthService): Router {
  const router = Router();
  router.get('/health', createHealthController(service));
  return router;
}
