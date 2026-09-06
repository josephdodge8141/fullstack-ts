import { authSessionSchema, type AuthSession } from '@app/schemas';

const defaultSessionEndpoint = '/api/v1/auth/session';
const defaultLogoutEndpoint = '/api/v1/auth/logout';

export interface AuthRequestOptions {
  readonly endpoint?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export async function fetchAuthSession(options: AuthRequestOptions = {}): Promise<AuthSession> {
  const response = await request(options, options.endpoint ?? defaultSessionEndpoint, 'GET');
  if (!response.ok) {
    throw new Error(`Session request failed (${response.status})`);
  }
  return authSessionSchema.parse(await response.json());
}

export async function logout(options: AuthRequestOptions = {}): Promise<void> {
  const response = await request(options, options.endpoint ?? defaultLogoutEndpoint, 'POST');
  if (response.status !== 204) {
    throw new Error(`Logout request failed (${response.status})`);
  }
}

async function request(
  options: AuthRequestOptions,
  endpoint: string,
  method: 'GET' | 'POST',
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (fetchImpl === undefined) {
    throw new Error('Fetch is unavailable in this environment');
  }
  return fetchImpl(endpoint, {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: options.signal ?? null,
  });
}
