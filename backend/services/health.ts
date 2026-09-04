import { healthResponseSchema, type HealthResponse } from '../models/health.js';

export interface HealthService {
  getHealth(): HealthResponse;
}

export function createHealthService(): HealthService {
  return {
    getHealth: (): HealthResponse => healthResponseSchema.parse({ status: 'ok' }),
  };
}
