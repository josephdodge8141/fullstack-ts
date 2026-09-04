export interface ConnectionLifecycle {
  close(): Promise<void>;
  /** Abort all retained resources synchronously and idempotently. */
  forceAbort(): void;
}

/**
 * The narrow outbound contract used by the health service. Config owns the
 * concrete connection and the service only knows how to ask it for data.
 */
export interface HealthConnection {
  getHealth(): unknown;
}

export interface Connections extends ConnectionLifecycle {
  readonly health: HealthConnection;
}

/**
 * The starter has no external dependency yet, but its connection contract is
 * explicit so acceptance can replace the outbound adapter later.
 */
export function createConnections(): Connections {
  return {
    health: {
      getHealth: (): unknown => ({ status: 'ok' }),
    },
    close: async (): Promise<void> => undefined,
    forceAbort: (): void => undefined,
  };
}
