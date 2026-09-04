import { startServer } from './index.js';
import { createConnections, type Connections } from './config/connections.js';

const retainedHandle = setInterval(() => undefined, 1_000);
const connections: Connections = {
  ...createConnections(),
  close: async (): Promise<void> => {
    throw new Error('close failed');
  },
  forceAbort: (): void => {
    void retainedHandle;
    throw new Error('force abort failed');
  },
};

await startServer(
  {
    host: '127.0.0.1',
    port: 0,
    shutdownTimeoutMs: 10,
  },
  connections,
  { exitProcess: (code: number): void => process.exit(code) },
);
process.stdout.write('ready\n');
