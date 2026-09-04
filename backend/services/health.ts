import { healthResponseSchema, type HealthResponse } from '../models/health.js';
import type { HealthConnection } from '../config/connections.js';

export interface HealthService {
  getHealth(): HealthResponse;
}

export function createHealthService(connection: HealthConnection): HealthService {
  return {
    getHealth: (): HealthResponse => healthResponseSchema.parse(connection.getHealth()),
  };
}
