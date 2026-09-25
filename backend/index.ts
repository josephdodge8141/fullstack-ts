import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { createConnections, type Connections } from './config/connections.js';
import { loadEnvironment, type Environment } from './config/environment.js';

export interface RunningServer {
  readonly server: Server;
  shutdown(): Promise<void>;
}

export interface ServerRuntimeOptions {
  /** Terminate the executable after a signal cleanup failure. */
  readonly exitProcess?: (code: number) => void;
}

export class ConnectionShutdownTimeoutError extends Error {
  constructor(timeoutMs: number, options?: ErrorOptions) {
    super(`Connection shutdown timed out after ${timeoutMs} ms`, options);
    this.name = 'ConnectionShutdownTimeoutError';
  }
}

async function closeServer(server: Server, timeoutMs: number): Promise<void> {
  if (!server.listening) return;
  server.close();
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    once(server, 'close').then(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        server.closeIdleConnections();
        server.closeAllConnections();
        resolve();
      }, timeoutMs);
      timer.unref();
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
}

async function closeConnections(connections: Connections, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  let result: 'closed' | 'timeout';
  try {
    result = await Promise.race([
      connections.close().then(() => 'closed' as const),
      new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), timeoutMs);
        if (timer !== undefined) timer.unref();
      }),
    ]);
  } catch (error: unknown) {
    try {
      connections.forceAbort();
    } catch (abortError: unknown) {
      throw new AggregateError(
        [error, abortError],
        'Connection close failed and forced cleanup failed',
        { cause: error },
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
    throw error;
  }
  if (timer !== undefined) clearTimeout(timer);
  if (result === 'timeout') {
    try {
      connections.forceAbort();
    } catch (error: unknown) {
      throw new ConnectionShutdownTimeoutError(timeoutMs, { cause: error });
    }
    throw new ConnectionShutdownTimeoutError(timeoutMs);
  }
}

export async function startServer(
  environment: Environment = loadEnvironment(),
  connections: Connections = createConnections(),
  runtime: ServerRuntimeOptions = {},
): Promise<RunningServer> {
  let server: Server | undefined;
  let cleanupPromise: Promise<void> | undefined;
  const cleanupConnections = (): Promise<void> => {
    cleanupPromise ??= closeConnections(connections, environment.shutdownTimeoutMs);
    return cleanupPromise;
  };

  try {
    const createdServer = createServer(createApp({ connections }));
    server = createdServer;
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => reject(error);
      createdServer.once('error', onError);
      createdServer.listen(environment.port, environment.host, () => {
        createdServer.off('error', onError);
        resolve();
      });
    });
  } catch (error: unknown) {
    try {
      if (server !== undefined) await closeServer(server, environment.shutdownTimeoutMs);
      await cleanupConnections();
    } catch {
      // Preserve the startup error; the cleanup attempt remains idempotent.
    }
    throw error;
  }

  const startedServer = server;
  if (startedServer === undefined) {
    throw new Error('Server was not created');
  }
  const shutdown = async (): Promise<void> => {
    const currentCleanup = (cleanupPromise ??= (async (): Promise<void> => {
      await closeServer(startedServer, environment.shutdownTimeoutMs);
      await closeConnections(connections, environment.shutdownTimeoutMs);
    })());
    await currentCleanup;
  };
  const onSignal = (): void => {
    void shutdownWithCleanup().catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
      runtime.exitProcess?.(1);
    });
  };
  const shutdownWithCleanup = async (): Promise<void> => {
    try {
      await shutdown();
    } finally {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    }
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  return { server, shutdown: shutdownWithCleanup };
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && fileURLToPath(import.meta.url) === entrypoint) {
  const exitProcess = (code: number): void => process.exit(code);
  void startServer(loadEnvironment(), createConnections(), { exitProcess }).catch(
    (error: unknown) => {
      console.error(error);
      exitProcess(1);
    },
  );
}
