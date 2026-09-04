import { healthResponseSchema, type HealthResponse } from '@app/schemas';

const defaultHealthEndpoint = '/api/v1/health';

export interface HealthRequestOptions {
  readonly endpoint?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export async function fetchHealth(options: HealthRequestOptions = {}): Promise<HealthResponse> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const endpoint = options.endpoint ?? defaultHealthEndpoint;

  if (fetchImpl === undefined) {
    throw new Error('Fetch is unavailable in this environment');
  }

  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`Health request failed (${response.status})`);
  }

  return healthResponseSchema.parse(await response.json());
}
