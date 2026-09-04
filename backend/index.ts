import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { createConnections, type ConnectionLifecycle } from './config/connections.js';
import { loadEnvironment, type Environment } from './config/environment.js';

export interface RunningServer {
  readonly server: Server;
  shutdown(): Promise<void>;
}

async function closeServer(server: Server, timeoutMs: number): Promise<void> {
  if (!server.listening) return;
  server.close();
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    once(server, 'close').then(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        server.closeAllConnections();
        resolve();
      }, timeoutMs);
      timer.unref();
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
}

export async function startServer(
  environment: Environment = loadEnvironment(),
  connections: ConnectionLifecycle = createConnections(),
): Promise<RunningServer> {
  const server = createServer(createApp());
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error);
    server.once('error', onError);
    server.listen(environment.port, environment.host, () => {
      server.off('error', onError);
      resolve();
    });
  });

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await closeServer(server, environment.shutdownTimeoutMs);
    await connections.close();
  };
  const onSignal = (): void => {
    void shutdown();
  };
  const shutdownWithCleanup = async (): Promise<void> => {
    await shutdown();
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  return { server, shutdown: shutdownWithCleanup };
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && fileURLToPath(import.meta.url) === entrypoint) {
  void startServer().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
