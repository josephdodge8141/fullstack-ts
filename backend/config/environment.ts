export interface Environment {
  readonly host: string;
  readonly port: number;
  readonly shutdownTimeoutMs: number;
  readonly publicOrigin: string;
  readonly oidcIssuer: string;
  readonly oidcClientId: string;
  readonly sessionSecret: string;
}

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;
const DEFAULT_PUBLIC_ORIGIN = 'http://app.localhost:8088';
const DEFAULT_OIDC_ISSUER = 'http://app.localhost:8088/realms/local';
const DEFAULT_OIDC_CLIENT_ID = 'local-web';
const DEFAULT_SESSION_SECRET = 'local-development-session-secret-change-before-production';

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid integer environment value: ${value}`);
  }
  return parsed;
}

function absoluteUrl(value: string | undefined, fallback: string, name: string): string {
  const candidate = value?.trim() || fallback;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
    return parsed.origin === candidate.replace(/\/$/, '')
      ? parsed.origin
      : candidate.replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid URL environment value for ${name}: ${candidate}`);
  }
}

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const port = positiveInteger(source.PORT, DEFAULT_PORT);
  if (port > 65_535) throw new Error(`Invalid port environment value: ${source.PORT}`);
  const shutdownTimeoutMs = positiveInteger(
    source.SHUTDOWN_TIMEOUT_MS,
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
  );
  return {
    host: source.HOST?.trim() || DEFAULT_HOST,
    port,
    shutdownTimeoutMs,
    publicOrigin: absoluteUrl(source.PUBLIC_ORIGIN, DEFAULT_PUBLIC_ORIGIN, 'PUBLIC_ORIGIN'),
    oidcIssuer: absoluteUrl(source.OIDC_ISSUER, DEFAULT_OIDC_ISSUER, 'OIDC_ISSUER'),
    oidcClientId: source.OIDC_CLIENT_ID?.trim() || DEFAULT_OIDC_CLIENT_ID,
    sessionSecret: source.SESSION_SECRET?.trim() || DEFAULT_SESSION_SECRET,
  };
}
