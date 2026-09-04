import type { RequestHandler } from 'express';

import { healthResponseSchema } from '../models/health.js';
import type { HealthService } from '../services/health.js';

export function createHealthController(service: HealthService): RequestHandler {
  return (_request, response, next): void => {
    try {
      const body = healthResponseSchema.parse(service.getHealth());
      response.status(200).json(body);
    } catch (error: unknown) {
      next(error);
    }
  };
}
