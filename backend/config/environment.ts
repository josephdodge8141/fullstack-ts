export interface Environment {
  readonly host: string;
  readonly port: number;
  readonly shutdownTimeoutMs: number;
  readonly expoWebOrigin?: string;
}

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid integer environment value: ${value}`);
  }
  return parsed;
}

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const port = positiveInteger(source.PORT, DEFAULT_PORT);
  if (port > 65_535) throw new Error(`Invalid port environment value: ${source.PORT}`);
  const shutdownTimeoutMs = positiveInteger(
    source.SHUTDOWN_TIMEOUT_MS,
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
  );
  const expoWebOrigin = source.EXPO_WEB_ORIGIN?.trim();
  if (expoWebOrigin !== undefined && expoWebOrigin !== '') {
    const parsed = new URL(expoWebOrigin);
    if (parsed.origin !== expoWebOrigin || !['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('EXPO_WEB_ORIGIN must be an HTTP(S) origin');
    }
  }
  return {
    host: source.HOST?.trim() || DEFAULT_HOST,
    port,
    shutdownTimeoutMs,
    ...(expoWebOrigin === undefined || expoWebOrigin === '' ? {} : { expoWebOrigin }),
  };
}
