import { startServer } from './index.js';
import { createConnections, type Connections } from './config/connections.js';

const retainedHandle = setInterval(() => undefined, 1_000);
const connections: Connections = {
  ...createConnections(),
  close: async (): Promise<void> => {
    await new Promise<void>(() => undefined);
  },
  forceAbort: (): void => {
    clearInterval(retainedHandle);
  },
};

await startServer(
  {
    host: '127.0.0.1',
    port: 0,
    shutdownTimeoutMs: 10,
  },
  connections,
);
process.stdout.write('ready\n');
